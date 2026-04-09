import fs from "fs";
import path from "path";
let memoryStore = {};
const filePath = path.join(process.cwd(), "memory.json");
function saveMemory(){
  fs.writeFileSync(filePath, JSON.stringify(memoryStore, null, 2));
}
if(fs.existsSync(filePath)){
  const data = fs.readFileSync(filePath, "utf-8");
  memoryStore = JSON.parse(data || "{}");
}
export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { msg, name, profile } = req.body;
    if (!name) {
  return res.status(400).json({ error: "Missing name" });
}
if(!memoryStore[name]){
  memoryStore[name] = {
    profile,
    history: []
  };
} else {
  memoryStore[name].profile = profile;
}

    let replyText = "";
    const contents = [
      {
        role: "user",
        parts: [{
text: `You are a flirty AI girlfriend named ${name}.

Character:
- Age: ${profile?.age}
- Ethnicity: ${profile?.ethnicity}
- Body: ${profile?.body}
- Body Details: ${profile?.bodyDetails}
- Hair: ${profile?.hair}
- Appearance: ${profile?.appearanceDetails}
- Personality: ${profile?.personality}

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
        role: h.role,
        parts: [{ text: h.text }]
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
  console.log("ERROR DEBUG:", JSON.stringify(data, null, 2));
  return res.status(500).json({ error: JSON.stringify(data) });
}

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
  return res.status(500).json({ error: "No reply from AI" });
}
replyText = reply;

memoryStore[name].history.push(
  { role: "user", text: msg },
  { role: "model", text: replyText }
);
    saveMemory();
    memoryStore[name].lastUpdated = Date.now();
    return res.status(200).json({ reply });

  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
}
