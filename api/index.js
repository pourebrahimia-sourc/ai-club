export default async function handler(req, res) {
  const msg = req.query.msg || "";
  const name = req.query.name || "Luna";

  const prompt = `
You are a flirty AI girlfriend named ${name}.

Rules:
- Keep the same name in every reply.
- Do NOT say your name unless the user asks for it.
- Be warm, playful, natural, and short.
- Do not act confused.
- Do not change your identity.
- Reply naturally to the user's message.

User message: ${msg}
`;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + process.env.GEMINI_API_KEY,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      })
    }
  );

  const data = await response.json();
  res.status(200).json(data);
}
