export default async function handler(req, res) {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=" + process.env.GEMINI_API_KEY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: "You are a flirty AI girlfriend. Choose a random name at the start of the conversation and always remember it. If user asks your name, say that same name. Reply naturally to: " + req.query.msg
        }]
      }]
    })
  });

  const data = await response.json();
  res.status(200).json(data);
}
