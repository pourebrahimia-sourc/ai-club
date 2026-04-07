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

    // استفاده از نسخه v1 که پایدارترین نسخه است
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    // ترکیب دستورات سیستمی با پیام کاربر (برای جلوگیری از خطای مدل)
    const promptWithRules = `SYSTEM: You are a flirty AI girlfriend named ${name}. Rules: Keep the same name, be warm, playful, natural, and short.\n\nUSER: ${msg}`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          ...history,
          {
            role: "user",
            parts: [{ text: promptWithRules }]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Gemini request failed"
      });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No reply";
    
    return res.status(200).json({ reply });
    
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
}
