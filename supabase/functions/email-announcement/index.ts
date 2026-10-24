const RESEND_API_URL = "https://api.resend.com/emails";

type NotificationRecord = {
  category?: string;
  title?: string;
  message?: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const webhookSecret = Deno.env.get("ANNOUNCEMENT_WEBHOOK_SECRET");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const recipient = Deno.env.get("ANNOUNCEMENT_EMAIL");
  const sender = Deno.env.get("ANNOUNCEMENT_FROM_EMAIL");
  if (!webhookSecret || !resendApiKey || !recipient || !sender) {
    console.error("Announcement email function is missing required secrets.");
    return new Response("Email service is not configured", { status: 503 });
  }
  if (request.headers.get("x-announcement-secret") !== webhookSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: { record?: NotificationRecord };
  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const record = payload.record;
  if (record?.category !== "announcement") {
    return Response.json({ ignored: true });
  }
  if (!record.title?.trim() || !record.message?.trim()) {
    return new Response("Announcement title and message are required", { status: 400 });
  }

  const title = record.title.trim();
  const message = record.message.trim();
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: sender,
      to: [recipient],
      subject: `Study Maze announcement: ${title}`,
      text: `${title}\n\n${message}`,
      html: `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p><p>Open Study Maze to view this announcement in the app.</p>`,
    }),
  });

  if (!response.ok) {
    console.error("Resend rejected the announcement email:", await response.text());
    return new Response("Could not send announcement email", { status: 502 });
  }

  return Response.json({ sent: true });
});
