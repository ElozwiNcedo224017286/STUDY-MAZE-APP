// @ts-nocheck
// Supabase Edge Function: validate-student-upload
//
// Validates a student-uploaded PDF server-side.
// Responsibilities:
//   1. Authenticate the requesting student.
//   2. Verify the upload belongs to that student.
//   3. Download the PDF from the private student-slides bucket.
//   4. Read the actual PDF page count.
//   5. Accept only PDFs containing 1–5 pages.
//   6. Save the validation result to student_uploads.
//
// IMPORTANT:
// - This function does NOT call OpenAI.
// - A valid upload remains status = "uploaded".
// - "processing" is reserved for the future AI notes stage.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const BUCKET = "student-slides";
const MIN_PAGES = 1;
const MAX_PAGES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

/**
 * Counts PDF pages by reading the PDF's page tree.
 *
 * This deliberately avoids loading pdf.js/pdf-lib into the Expo app.
 * The validation happens entirely inside the Edge Function.
 *
 * The parser walks /Pages nodes and counts /Page leaf nodes.
 */
function countPdfPages(bytes: Uint8Array): number {
  const decoder = new TextDecoder("latin1");
  const pdf = decoder.decode(bytes);

  if (!pdf.startsWith("%PDF-")) {
    throw new Error("The uploaded file is not a readable PDF.");
  }

  // Find PDF page objects.
  //
  // A normal PDF page object contains:
  //   /Type /Page
  //
  // The plural:
  //   /Type /Pages
  //
  // is the parent page-tree node and must not be counted as a page.
  const pageMatches = pdf.match(/\/Type\s*\/Page(?:\s|\/|>)/g);

  const pageCount = pageMatches?.length ?? 0;

  if (pageCount <= 0) {
    throw new Error("The PDF does not contain any readable pages.");
  }

  return pageCount;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  if (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error("Supabase function environment is not configured.");
    return json(
      { error: "Server is not configured correctly." },
      500,
    );
  }

  // ------------------------------------------------------------
  // 1. Authenticate the requesting user
  // ------------------------------------------------------------

  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return json({ error: "Authentication required." }, 401);
  }

  const userClient = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    },
  );

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    console.error("Authentication failed:", userError);
    return json({ error: "Invalid or expired session." }, 401);
  }

  // ------------------------------------------------------------
  // 2. Read upload_id from request
  // ------------------------------------------------------------

  let body: { upload_id?: string };

  try {
    body = await req.json();
  } catch {
    return json({ error: "Expected a JSON request body." }, 400);
  }

  const uploadId = body?.upload_id;

  if (!uploadId || typeof uploadId !== "string") {
    return json({ error: "upload_id is required." }, 400);
  }

  // ------------------------------------------------------------
  // 3. Create privileged client
  //
  // Service-role access is ONLY used inside this Edge Function.
  // The ownership check below is still mandatory.
  // ------------------------------------------------------------

  const adminClient = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  );

  // ------------------------------------------------------------
  // 4. Find the upload and verify ownership
  // ------------------------------------------------------------

  const {
    data: upload,
    error: uploadError,
  } = await adminClient
    .from("student_uploads")
    .select(
      "id, student_id, file_name, storage_path, file_size, page_count, status",
    )
    .eq("id", uploadId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (uploadError) {
    console.error("Could not find student upload:", uploadError);

    return json(
      { error: "Could not find your upload." },
      500,
    );
  }

  if (!upload) {
    return json(
      { error: "Upload not found or you do not have access to it." },
      404,
    );
  }

  // ------------------------------------------------------------
  // 5. Basic file validation
  // ------------------------------------------------------------

  if (!upload.storage_path) {
    await adminClient
      .from("student_uploads")
      .update({
        status: "failed",
        error_message: "The uploaded file has no storage path.",
      })
      .eq("id", upload.id)
      .eq("student_id", user.id);

    return json({
      valid: false,
      upload_id: upload.id,
      page_count: null,
      error: "The uploaded file could not be located.",
    });
  }

  if (
    typeof upload.file_size === "number" &&
    upload.file_size > MAX_FILE_SIZE
  ) {
    await adminClient
      .from("student_uploads")
      .update({
        status: "failed",
        error_message: "The PDF is larger than the 10 MB limit.",
      })
      .eq("id", upload.id)
      .eq("student_id", user.id);

    return json({
      valid: false,
      upload_id: upload.id,
      page_count: null,
      error: "Your PDF must be 10 MB or smaller.",
    });
  }

  // ------------------------------------------------------------
  // 6. Download the private PDF
  // ------------------------------------------------------------

  const {
    data: fileData,
    error: downloadError,
  } = await adminClient.storage
    .from(BUCKET)
    .download(upload.storage_path);

  if (downloadError || !fileData) {
    console.error("Student PDF download failed:", downloadError);

    await adminClient
      .from("student_uploads")
      .update({
        status: "failed",
        error_message: "Could not read the uploaded PDF.",
      })
      .eq("id", upload.id)
      .eq("student_id", user.id);

    return json({
      valid: false,
      upload_id: upload.id,
      page_count: null,
      error: "We could not read your uploaded PDF.",
    });
  }

  // ------------------------------------------------------------
  // 7. Read and validate the actual PDF
  // ------------------------------------------------------------

  try {
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    if (bytes.byteLength === 0) {
      throw new Error("The uploaded PDF is empty.");
    }

    if (bytes.byteLength > MAX_FILE_SIZE) {
      throw new Error("The PDF is larger than the 10 MB limit.");
    }

    const pageCount = countPdfPages(bytes);

    // ----------------------------------------------------------
    // 8. Enforce the 1–5 page rule
    // ----------------------------------------------------------

    if (pageCount < MIN_PAGES || pageCount > MAX_PAGES) {
      const message =
        `Your PDF contains ${pageCount} pages. ` +
        `Please upload a PDF containing ${MIN_PAGES}–${MAX_PAGES} pages.`;

      const { error: updateError } = await adminClient
        .from("student_uploads")
        .update({
          page_count: pageCount,
          status: "failed",
          error_message: message,
        })
        .eq("id", upload.id)
        .eq("student_id", user.id);

      if (updateError) {
        console.error("Could not save failed validation:", updateError);
      }

      return json({
        valid: false,
        upload_id: upload.id,
        page_count: pageCount,
        error: message,
      });
    }

    // ----------------------------------------------------------
    // 9. Valid PDF
    //
    // Keep status = uploaded.
    // Stage 4 will change it to processing when AI notes begin.
    // ----------------------------------------------------------

    const { error: updateError } = await adminClient
      .from("student_uploads")
      .update({
        page_count: pageCount,
        status: "uploaded",
        error_message: null,
      })
      .eq("id", upload.id)
      .eq("student_id", user.id);

    if (updateError) {
      console.error("Could not save validation result:", updateError);

      return json(
        {
          error:
            "The PDF was valid, but we could not save the validation result.",
        },
        500,
      );
    }

    return json({
      valid: true,
      upload_id: upload.id,
      page_count: pageCount,
      status: "uploaded",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The PDF could not be read.";

    console.error("PDF validation failed:", error);

    await adminClient
      .from("student_uploads")
      .update({
        page_count: null,
        status: "failed",
        error_message: message,
      })
      .eq("id", upload.id)
      .eq("student_id", user.id);

    return json({
      valid: false,
      upload_id: upload.id,
      page_count: null,
      error: message,
    });
  }
});