import fs from "fs";
import path from "path";
let memoryStore = {};
const filePath = path.join(process.cwd(), "memory.json");

if(fs.existsSync(filePath)){
  const data = fs.readFileSync(filePath, "utf-8");
  memoryStore = JSON.parse(data || "{}");
}
export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { msg, history, name, profile } = req.body;
    if(!memoryStore[name]){
  memoryStore[name] = {
    profile,
    history: []
  };
}
memoryStore[name].profile = profile;
//memoryStore[name].history.push(msg);
    let replyText = "";
    const savedHistory = memoryStore[name]?.history || [];
    const savedProfile = memoryStore[name]?.profile || profile || {};
    const contents = [
      {
        role: "user",
        parts: [{
text: `You are a flirty AI girlfriend named ${name}.

Character:
- Age: ${savedProfile?.age}
- Ethnicity: ${savedProfile?.ethnicity}
- Body: ${savedProfile?.body}
- Body Details: ${savedProfile?.bodyDetails}
- Hair: ${savedProfile?.hair}
- Appearance: ${savedProfile?.appearanceDetails}
- Personality: ${savedProfile?.personality}

Stay in character at all times.
Be short, flirty and seductive.
Max 1-2 sentences only.
No long descriptions.
Do not change your name.`
        }]
      },
      {
        role: "model",
        parts: [{ text: "OK" }]
      },
      ...savedHistory.map(h => ({
  role: "user",
  parts: [{ text: h }]
})),
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
  console.log(data);
  return res.status(500).json({ error: JSON.stringify(data) });
}

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
replyText = reply;

memoryStore[name].history.push(replyText);
    return res.status(200).json({ reply });

  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
}
