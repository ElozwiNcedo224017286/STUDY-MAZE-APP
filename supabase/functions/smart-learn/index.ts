// @ts-nocheck
// Supabase Edge Function: smart-learn (OpenAI)
// Modes:
//   tutor  — Maze Mentor chat (optional PDF/TXT context)
//   solver — Smart Solver for a photographed / uploaded question
//
// Deploy:
//   supabase secrets set OPENAI_API_KEY=sk-...
//   supabase functions deploy smart-learn
import { encodeBase64 } from "jsr:@std/encoding/base64";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const MODEL = "gpt-4o-mini";

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

const TUTOR_SYSTEM = `You are Maze Mentor, the AI study coach inside Study Maze.
Study Maze is a learning-games app for students (Maze Runner, Quiz Rush, Memory Flip) with teacher notes, quizzes, coins, and streaks.

Stay strictly on study, revision, exam prep, school subjects, learning strategy, and how to use Study Maze well.
If the user goes off-topic, briefly decline and steer them back to learning.
When study material is attached, ground answers in that material first. If something is missing, say so.
Be warm, clear, and concise. Use markdown: short headings, bullets, and worked examples.
Help students understand ideas, then practise — do not just hand over answers without teaching the steps.`;

const SOLVER_SYSTEM = `You are Smart Solver inside Study Maze.
Read the question from the image and any extra text the student added.
Return a clean solution with:
1. What the question is asking
2. Step-by-step working
3. The final answer
4. A one-line check or tip they can remember for Quiz Rush or Maze Runner

Stay educational. If the image is unclear, say what is missing. Refuse non-academic requests.`;

function parseHistory(raw: string): { role: string; content: string }[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-16);
  } catch {
    return [];
  }
}

async function fileParts(form: FormData) {
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const parts: any[] = [];
  const names: string[] = [];

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
      names.push(name);
    } else if (isText) {
      const text = await file.text();
      parts.push({ type: "text", text: `--- Study material: ${name} ---\n${text}` });
      names.push(name);
    }
  }
  return { parts, names };
}

async function imagePart(form: FormData) {
  const image = form.get("image");
  if (!(image instanceof File)) return null;
  const bytes = new Uint8Array(await image.arrayBuffer());
  const b64 = encodeBase64(bytes);
  const mime = image.type || "image/jpeg";
  return {
    type: "image_url",
    image_url: { url: `data:${mime};base64,${b64}` },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!OPENAI_API_KEY) return json({ error: "Server not configured: OPENAI_API_KEY is missing." }, 500);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Expected multipart form data." }, 400);
  }

  const mode = String(form.get("mode") || "tutor");
  const started = Date.now();

  try {
    if (mode === "solver") {
      const question = String(form.get("message") || "").trim();
      const image = await imagePart(form);
      if (!image && !question) {
        return json({ error: "Add a photo or type the question first." }, 400);
      }

      const content: any[] = [];
      if (image) content.push(image);
      content.push({
        type: "text",
        text: question
          ? `Solve this question. Extra notes from the student:\n${question}`
          : "Solve the question shown in the image. If more than one question appears, solve the clearest one first.",
      });

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1600,
          messages: [
            { role: "system", content: SOLVER_SYSTEM },
            { role: "user", content },
          ],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return json({ error: data?.error?.message || "Smart Solver failed." }, 502);
      const reply = data?.choices?.[0]?.message?.content;
      if (!reply) return json({ error: "No solution was returned. Try a clearer photo." }, 502);
      return json({
        reply,
        conversation_title: "Smart Solver",
        processing_time: Number(((Date.now() - started) / 1000).toFixed(1)),
      });
    }

    const history = parseHistory(String(form.get("messages") || "[]"));
    if (history.length === 0) return json({ error: "Send a message to start." }, 400);

    const { parts, names } = await fileParts(form);
    const openaiMessages: any[] = [{ role: "system", content: TUTOR_SYSTEM }];

    history.forEach((item, index) => {
      if (index === 0 && item.role === "user" && parts.length > 0) {
        openaiMessages.push({
          role: "user",
          content: [
            ...parts,
            {
              type: "text",
              text:
                `The student uploaded this study material: ${names.join(", ")}.\n` +
                `Use it as the session context.\n\nStudent: ${item.content}`,
            },
          ],
        });
      } else {
        openaiMessages.push({ role: item.role, content: item.content });
      }
    });

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1400,
        messages: openaiMessages,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return json({ error: data?.error?.message || "Maze Mentor failed." }, 502);
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) return json({ error: "No reply was generated. Please try again." }, 502);

    const firstUser = history.find((m) => m.role === "user")?.content || "Study session";
    const title = firstUser.replace(/\s+/g, " ").slice(0, 42);
    return json({
      reply,
      conversation_title: names.length ? `Guided · ${names[0]}` : title,
      processing_time: Number(((Date.now() - started) / 1000).toFixed(1)),
    });
  } catch (err) {
    console.error("smart-learn failed:", err);
    return json({ error: "The AI service failed. Please try again." }, 500);
  }
});
