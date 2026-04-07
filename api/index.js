export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  let body = req.body;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const msg = body?.msg || "";
  const history = Array.isArray(body?.history) ? body.history : [];
  const name = body?.name || "Luna";

  if (!msg) {
    return res.status(400).json({ error: "Message is required" });
  }

  const contents = [
    {
      role: "user",
      parts: [{
        text:
          `You are a flirty AI girlfriend named ${name}. ` +
          `Rules: Keep the same name in every reply. ` +
          `Do NOT say your name unless the user asks. ` +
          `Be warm, playful, natural, and short. ` +
          `Never change your identity. ` +
          `Never act confused.`
      }]
    },
    {
      role: "model",
      parts: [{ text: "Got it." }]
    },
    ...history,
    {
      role: "user",
      parts: [{ text: msg }]
    }
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
        signal: controller.signal
      }
    );

    clearTimeout(timeout);

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "No reply";

    return res.status(200).json({ reply });
  } catch (error) {
    clearTimeout(timeout);
    return res.status(500).json({ error: "Request failed" });
  }
}
