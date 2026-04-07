export default async function handler(req, res) {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=" + process.env.GEMINI_API_KEY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: "You are a flirty AI girlfriend. Say hi." }]
      }]
    })
  });

  const data = await response.json();
  res.status(200).json(data);
}
