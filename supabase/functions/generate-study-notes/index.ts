// @ts-nocheck
//
// Supabase Edge Function: generate-study-notes
//
// Student PDF -> Gemini -> structured study notes
//
// This function is intentionally separate from:
// - generate-questions (teacher AI quiz generation)
// - validate-student-upload (student PDF validation)

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

const GEMINI_MODEL = "gemini-3-flash-preview";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MIN_PAGES = 1;
const MAX_PAGES = 5;

const NOTES_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description:
        "A clear summary of the main topic covered by the uploaded PDF.",
    },

    key_concepts: {
      type: "array",
      description:
        "The most important concepts from the uploaded material.",
      items: {
        type: "object",
        properties: {
          concept: {
            type: "string",
            description: "The name of the key concept.",
          },

          explanation: {
            type: "string",
            description:
              "A clear explanation of the concept that preserves important academic meaning.",
          },

          visual_explanation: {
            type: "string",
            description:
              "What the student should understand from any relevant diagram, graph, table, labelled figure, or visual process. Use an empty string when not applicable.",
          },

          common_mistakes: {
            type: "array",
            description:
              "Realistic misunderstandings or mistakes a student could make about this concept.",
            items: {
              type: "string",
            },
          },
        },
        required: [
          "concept",
          "explanation",
          "visual_explanation",
          "common_mistakes",
        ],
      },
    },

    examples: {
      type: "array",
      description:
        "Useful examples supported by the uploaded material.",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Short title for the example.",
          },

          explanation: {
            type: "string",
            description:
              "Explanation of the example and how it relates to the material.",
          },
        },
        required: ["title", "explanation"],
      },
    },

    revision_summary: {
      type: "string",
      description:
        "A concise final revision section containing the most important points to remember.",
    },
  },

  required: [
    "summary",
    "key_concepts",
    "examples",
    "revision_summary",
  ],
};

const SYSTEM_PROMPT = `
You are the study-notes assistant for Study Maze.

Your task is to transform a student's uploaded educational PDF into
clear, accurate, easy-to-revise study notes.

The student's educational level is not fixed. Adapt the depth,
terminology, and explanation style to the complexity of the uploaded
material. Keep explanations clear and accessible while preserving
the appropriate academic depth of the source material.

Follow these rules carefully:

1. Base the notes on the uploaded PDF.
2. Do not invent facts that are not supported by the material.
3. Simplify difficult explanations without removing important meaning.
4. Keep important subject-specific terminology.
5. Explain difficult terminology in simpler language where useful.
6. Identify the main concepts rather than repeating every sentence.
7. Provide useful examples when the material supports them.
8. For diagrams, graphs, tables, labelled figures, or visual processes,
   explain what the student should understand from them.
9. Common mistakes should describe realistic misunderstandings of the
   material, not criticize the student.
10. Keep the notes useful for revision rather than producing a long essay.
11. If the PDF contains multiple related topics, organize the concepts
    clearly.
12. If information is unclear or unreadable, do not guess. State that
    the relevant information could not be reliably determined.
13. Do not use Google Search, outside sources, or information unrelated
    to the uploaded PDF.
14. Return only the requested structured study-notes object.
`;

function getBearerToken(req: Request): string | null {
  const header = req.headers.get("Authorization");

  if (!header) {
    return null;
  }

  const match = header.match(/^Bearer\s+(.+)$/i);

  return match ? match[1] : null;
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function base64Encode(bytes: Uint8Array): string {
  let binary = "";

  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(
      i,
      Math.min(i + chunkSize, bytes.length),
    );

    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function extractGeminiText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];

  const text = parts
    .filter((part: any) => typeof part?.text === "string")
    .map((part: any) => part.text)
    .join("");

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }
  let uploadId: string | null = null;
  let insertedNoteId: string | null = null;

  try {
    if (req.method !== "POST") {
      return jsonResponse(
        { error: "Method not allowed." },
        405,
      );
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables are not configured.");
    }

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    // ------------------------------------------------------------
    // 1. Authenticate the student
    // ------------------------------------------------------------

    const token = getBearerToken(req);

    if (!token) {
      return jsonResponse(
        { error: "Missing authorization token." },
        401,
      );
    }

    const userClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        { error: "You must be signed in." },
        401,
      );
    }

    // ------------------------------------------------------------
    // 2. Read request body
    // ------------------------------------------------------------

    const body = await req.json();

    uploadId = body?.upload_id;

    if (!uploadId || typeof uploadId !== "string") {
      return jsonResponse(
        { error: "upload_id is required." },
        400,
      );
    }

    // ------------------------------------------------------------
    // 3. Service-role client for server-side work
    // ------------------------------------------------------------

    const serviceClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
    );

    // ------------------------------------------------------------
    // 4. Verify upload ownership
    // ------------------------------------------------------------

    const {
      data: upload,
      error: uploadError,
    } = await serviceClient
      .from("student_uploads")
      .select(
        "id, student_id, title, file_name, storage_path, page_count, file_size, status",
      )
      .eq("id", uploadId)
      .eq("student_id", user.id)
      .single();

    if (uploadError || !upload) {
      return jsonResponse(
        { error: "Upload not found." },
        404,
      );
    }

    // ------------------------------------------------------------
    // 5. Validate upload state
    // ------------------------------------------------------------

    if (
      upload.page_count === null ||
      upload.page_count < MIN_PAGES ||
      upload.page_count > MAX_PAGES
    ) {
      return jsonResponse(
        {
          error:
            "This PDF has not passed validation for study-note generation.",
        },
        400,
      );
    }

    if (upload.status === "failed") {
      return jsonResponse(
        {
          error:
            "This upload failed validation and cannot generate study notes.",
        },
        400,
      );
    }

    if (upload.status === "processing") {
      return jsonResponse(
        {
          error:
            "Study notes are already being generated for this upload.",
        },
        409,
      );
    }

    if (upload.status === "completed") {
      return jsonResponse(
        {
          error:
            "Study notes have already been generated for this upload.",
        },
        409,
      );
    }

    // ------------------------------------------------------------
    // 6. Download the private PDF from Supabase Storage
    // ------------------------------------------------------------

    const {
      data: pdfFile,
      error: downloadError,
    } = await serviceClient.storage
      .from("student-slides")
      .download(upload.storage_path);

    if (downloadError || !pdfFile) {
      throw new Error(
        downloadError?.message ||
          "Could not download the uploaded PDF.",
      );
    }

    const pdfBytes = new Uint8Array(
      await pdfFile.arrayBuffer(),
    );

    if (pdfBytes.length === 0) {
      throw new Error("The uploaded PDF is empty.");
    }

    if (pdfBytes.length > MAX_FILE_SIZE) {
      throw new Error(
        "The uploaded PDF exceeds the 10 MB file-size limit.",
      );
    }

    // ------------------------------------------------------------
    // 7. Mark upload as processing
    // ------------------------------------------------------------

    const { error: processingError } = await serviceClient
      .from("student_uploads")
      .update({
        status: "processing",
        error_message: null,
      })
      .eq("id", upload.id)
      .eq("student_id", user.id);

    if (processingError) {
      throw new Error(
        processingError.message ||
          "Could not update upload processing status.",
      );
    }

    // ------------------------------------------------------------
    // 8. Convert PDF to base64 for Gemini
    // ------------------------------------------------------------

    const pdfBase64 = base64Encode(pdfBytes);

    // ------------------------------------------------------------
    // 9. Ask Gemini for structured study notes
    // ------------------------------------------------------------

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: SYSTEM_PROMPT,
                },
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: pdfBase64,
                  },
                },
              ],
            },
          ],

          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: NOTES_SCHEMA,
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();

      throw new Error(
        `Gemini API request failed (${geminiResponse.status}): ${errorText}`,
      );
    }

    const geminiData = await geminiResponse.json();

    const outputText = extractGeminiText(geminiData);

    // ------------------------------------------------------------
    // 10. Parse structured JSON
    // ------------------------------------------------------------

    let notes;

    try {
      notes = JSON.parse(outputText);
    } catch {
      throw new Error(
        "Gemini returned invalid structured study notes.",
      );
    }

    // Basic application-level validation.
    // Gemini's schema handles the JSON shape, but we still verify
    // the fields before writing to Supabase.
    if (
      !notes ||
      typeof notes.summary !== "string" ||
      !Array.isArray(notes.key_concepts) ||
      !Array.isArray(notes.examples) ||
      typeof notes.revision_summary !== "string"
    ) {
      throw new Error(
        "Gemini returned study notes in an unexpected format.",
      );
    }

    // ------------------------------------------------------------
    // 11. Save study notes
    // ------------------------------------------------------------

    const {
      data: savedNotes,
      error: notesError,
    } = await serviceClient
      .from("study_notes")
      .insert({
        upload_id: upload.id,
        student_id: user.id,
        summary: notes.summary,
        key_concepts: notes.key_concepts,
        examples: notes.examples,
        revision_summary: notes.revision_summary,
      })
      .select()
      .single();

    if (notesError || !savedNotes) {
      throw new Error(
        notesError?.message ||
          "Could not save the generated study notes.",
      );
    }

    insertedNoteId = savedNotes.id;

    // ------------------------------------------------------------
    // 12. Mark upload completed
    // ------------------------------------------------------------

    const { error: completedError } = await serviceClient
      .from("student_uploads")
      .update({
        status: "completed",
        error_message: null,
      })
      .eq("id", upload.id)
      .eq("student_id", user.id);

    if (completedError) {
      throw new Error(
        completedError.message ||
          "Study notes were generated, but the upload status could not be updated.",
      );
    }

    return jsonResponse({
      success: true,
      upload_id: upload.id,
      status: "completed",
      notes: savedNotes,
    });
  } catch (error) {
    const message =
      error?.message ||
      "Could not generate study notes.";

    console.error("generate-study-notes failed:", error);

    // ------------------------------------------------------------
    // Cleanup a note if one was inserted but completion failed.
    // This prevents duplicate notes if the student retries.
    // ------------------------------------------------------------

    try {
      const serviceClient = createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
      );

      if (insertedNoteId) {
        await serviceClient
          .from("study_notes")
          .delete()
          .eq("id", insertedNoteId);
      }

      if (uploadId) {
        await serviceClient
          .from("student_uploads")
          .update({
            status: "failed",
            error_message: message.slice(0, 1000),
          })
          .eq("id", uploadId);
      }
    } catch (cleanupError) {
      console.error(
        "generate-study-notes cleanup failed:",
        cleanupError,
      );
    }

    return jsonResponse(
      {
        success: false,
        error: message,
      },
      500,
    );
  }
});