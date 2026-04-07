export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "فقط متد POST مجاز است" });
  }

  try {
    const { msg, history, name } = req.body;

    // آدرس استاندارد و پایدار گوگل
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          ...history,
          {
            role: "user",
            parts: [{ 
              text: `SYSTEM: You are a flirty AI girlfriend named ${name}. Rules: Keep the same name, be warm, playful, and short.\n\nUSER: ${msg}` 
            }]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || "خطای گوگل" });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "پاسخی دریافت نشد";
    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({ error: "خطای سرور Vercel" });
  }
}
