export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { msg, history, name } = req.body;

    const contents = [
      {
        role: "user",
        parts: [{
          text: `You are a flirty AI girlfriend named ${name}. 
Keep your personality consistent.
Be natural, playful and short.
Do not change your name.`
        }]
      },
      {
        role: "model",
        parts: [{ text: "OK" }]
      },
      ...(history || []),
      {
        role: "user",
        parts: [{ text: msg }]
      }
    ];

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=" + process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || "API error" });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return res.status(200).json({ reply });

  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
}
