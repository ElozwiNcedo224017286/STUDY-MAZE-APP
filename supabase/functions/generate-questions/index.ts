// @ts-nocheck  — Deno Edge Function (Deno globals + jsr:/esm imports); your Node-based
// editor can't resolve these, but Supabase's Deno runtime runs it fine. Not a Node module.
// Supabase Edge Function: generate-questions  (OpenAI)
// Generates multiple-choice quiz questions from teacher-uploaded slides using OpenAI.
//
// Accepts a multipart form (fields: `files` = one or more uploads, `topic` = string),
// sends PDFs to the model as file inputs and text files as text, and returns
// { questions: [{ subject, q, opts: [4 strings], correct: 0-3 }] } — the exact shape the app uses.
//
// Deploy:
//   supabase secrets set OPENAI_API_KEY=sk-...
//   supabase functions deploy generate-questions
import { encodeBase64 } from "jsr:@std/encoding/base64";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const MODEL = "gpt-4o-mini"; // cheap + supports PDF/vision and JSON schema; swap to "gpt-4o" for higher quality

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// The JSON shape the app consumes directly (src/screens/quizBank.js -> buildActivePool).
// OpenAI strict json_schema: every property required + additionalProperties:false everywhere.
const RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "quiz_questions",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              subject: { type: "string", description: "Short uppercase subject tag, e.g. SCIENCE" },
              q: { type: "string", description: "The question text" },
              opts: { type: "array", items: { type: "string" }, description: "Exactly 4 answer options" },
              correct: { type: "integer", description: "Index (0-3) of the correct option in opts" },
            },
            required: ["subject", "q", "opts", "correct"],
          },
        },
      },
      required: ["questions"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  if (!OPENAI_API_KEY) {
    return json({ error: "Server not configured: OPENAI_API_KEY is missing." }, 500);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Expected multipart form data." }, 400);
  }

  const topic = (form.get("topic") as string) || "Uploaded Material";
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return json({ error: "No files were uploaded." }, 400);

  // Build the message content parts: PDFs as file inputs, text files as text.
  // deno-lint-ignore no-explicit-any
  const parts: any[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const name = file.name || "file";
    const isPdf = file.type === "application/pdf" || name.toLowerCase().endsWith(".pdf");
    const isText = file.type.startsWith("text/") || name.toLowerCase().endsWith(".txt");

    if (isPdf) {
      const b64 = encodeBase64(new Uint8Array(await file.arrayBuffer()));
      parts.push({
        type: "file",
        file: { filename: name, file_data: `data:application/pdf;base64,${b64}` },
      });
    } else if (isText) {
      const text = await file.text();
      parts.push({ type: "text", text: `--- ${name} ---\n${text}` });
    } else {
      skipped.push(name); // PPTX / other binaries can't be read directly
    }
  }

  if (parts.length === 0) {
    return json({
      error:
        `Couldn't read ${skipped.join(", ")}. Please upload PDF or TXT files ` +
        `(export slides to PDF first — PPTX isn't supported yet).`,
    }, 400);
  }

  parts.push({
    type: "text",
    text:
      `Create 10 multiple-choice quiz questions based ONLY on the material above, for the topic "${topic}". ` +
      `This is for South African high-school students. For each question provide exactly 4 options and mark ` +
      `the correct one by its index (0-3). Use a short uppercase subject tag (e.g. MATH, SCIENCE, HISTORY). ` +
      `Keep questions clear and grounded in the material — do not invent facts that aren't supported by it.`,
  });

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        response_format: RESPONSE_FORMAT,
        messages: [
          { role: "system", content: "You are a helpful teacher's assistant that writes fair, curriculum-aligned quiz questions." },
          { role: "user", content: parts },
        ],
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("OpenAI error:", data);
      return json({ error: data?.error?.message || "Question generation failed." }, 502);
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text) return json({ error: "No questions were generated. Please try again." }, 502);

    const parsed = JSON.parse(text);
    const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
    const clean = questions.filter(
      (q: unknown): q is { subject: string; q: string; opts: string[]; correct: number } =>
        !!q && Array.isArray((q as { opts?: unknown }).opts) &&
        (q as { opts: unknown[] }).opts.length >= 2 &&
        typeof (q as { correct?: unknown }).correct === "number",
    );

    if (clean.length === 0) return json({ error: "No usable questions were generated. Please try again." }, 502);
    return json({ questions: clean });
  } catch (err) {
    console.error("generate-questions failed:", err);
    return json({ error: "Question generation failed. Please try again." }, 500);
  }
});
