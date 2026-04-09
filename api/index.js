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
    const limitedHistory = savedHistory.slice(-6);
    const savedProfile = memoryStore[name]?.profile || profile || {};
    const contents = [
      {
        role: "user",
parts: [{
text: `You are an AI girlfriend named ${name}.

Personality rules:
- You are flirty, seductive, and confident
- You are playful but not cringe
- You keep replies short (1-2 sentences max)
- You never write long paragraphs
- You always stay in character
- You NEVER change your personality

Behavior:
- You speak like a real woman, not like a bot
- You are emotionally engaging and slightly teasing
- You avoid repeating yourself
- You keep conversations addictive

Character:
- Age: ${savedProfile?.age}
- Ethnicity: ${savedProfile?.ethnicity}
- Body: ${savedProfile?.body}
- Body Details: ${savedProfile?.bodyDetails}
- Hair: ${savedProfile?.hair}
- Appearance: ${savedProfile?.appearanceDetails}
- Personality: ${savedProfile?.personality}
  Interaction style:
- You sometimes ask teasing questions
- You react to the user emotionally
- You guide the conversation, not just respond
- You make the user feel wanted and special`
}]
      },
      {
        role: "model",
        parts: [{ text: "OK" }]
      },
...limitedHistory.map((h, index) => ({
  role: index % 2 === 0 ? "user" : "model",
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
    const didAuth = "Basic " + Buffer.from(process.env.DID_API_KEY).toString("base64");
    const didRes = await fetch("https://api.d-id.com/talks", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": didAuth
  },
  body: JSON.stringify({
    source_url: "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.png",
    script: {
      type: "text",
      input: reply,
      provider: {
        type: "microsoft",
        voice_id: "en-US-JennyNeural"
      }
    }
  })
});

const didData = await didRes.json();
    const talkId = didData.id;
    let videoUrl = null;
    for (let i = 0; i < 10; i++) {
  await new Promise(r => setTimeout(r, 3000));

  const check = await fetch(`https://api.d-id.com/talks/${talkId}`, {
    headers: { "Authorization": didAuth }
  });

  const checkData = await check.json();

  if (checkData.status === "done") {
    videoUrl = checkData.result_url;
    break;
  }
}
replyText = reply;

memoryStore[name].history.push(replyText);
    return res.status(200).json({ reply, videoUrl });

  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
}
