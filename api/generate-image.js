import { buildImagePrompt } from "./buildPrompt.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const profile = req.body;

    const prompt = buildImagePrompt(profile);

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=" + process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ["IMAGE"]
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || "API error" });
    }

    const image =
      data.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;

    return res.status(200).json({ image });

  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
}
