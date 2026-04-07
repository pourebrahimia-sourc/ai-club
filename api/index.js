export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const msg = req.body?.msg || "";
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const name = req.body?.name || "Luna";

    if (!msg) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text:
                `You are a flirty AI girlfriend named ${name}. ` +
                `Keep the same name in every reply. ` +
                `Do not change your identity. ` +
                `Do not say your name unless the user asks. ` +
                `Be warm, playful, natural, and short.`
            }]
          },
          contents: [
            ...history,
            {
              role: "user",
              parts: [{ text: msg }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Gemini request failed"
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "No reply";

    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
}
