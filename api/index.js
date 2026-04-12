import fs from "fs";
import path from "path";
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

let memoryStore = {};
const filePath = path.join(process.cwd(), "memory.json");

if (fs.existsSync(filePath)) {
  const data = fs.readFileSync(filePath, "utf-8");
  memoryStore = JSON.parse(data || "{}");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { msg, name, profile } = req.body;
    const USER_ID = "f5af3bfe-ef28-4f69-811b-747cc7e47fb5";

    if (msg === "generate image") {
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', USER_ID)
        .single();

      if (walletError || !wallet || Number(wallet.balance) < 10) {
        return res.status(200).json({ error: "Not enough tokens" });
      }

      const savedProfile = profile || {};

const imagePrompt = `beautiful AI girlfriend, half body, vertical portrait, ultra realistic,
${savedProfile?.ethnicity || ""} woman,
${savedProfile?.age || ""} years old, young adult, fresh face, youthful skin, soft facial features,
${savedProfile?.body || ""} body,
${savedProfile?.hair || ""} hair,
${savedProfile?.appearanceDetails || ""},
${savedProfile?.personality || ""} personality,

wearing a feminine sexy outfit, off-shoulder top, crop top, soft cleavage, no jacket, no coat,

warm lighting, natural skin tones, no green tint, realistic colors, soft warm cinematic light,

attractive, flirty, soft smile,
high detail skin, ultra realistic, sharp focus, professional photography, 85mm lens, 4k`;

      const imgRes = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=" + process.env.GEMINI_API_KEY,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: imagePrompt }]
              }
            ]
          })
        }
      );

      const imgData = await imgRes.json();

      if (!imgRes.ok) {
        return res.status(500).json({ error: JSON.stringify(imgData) });
      }

const imageBase64 =
  imgData.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data || null;

if (!imageBase64) {
  return res.status(500).json({ error: "Image generation failed" });
}

const fileName = `ai-${Date.now()}.png`;
const buffer = Buffer.from(imageBase64, "base64");

const { error: uploadError } = await supabase.storage
  .from('ai-images')
  .upload(fileName, buffer, {
    contentType: 'image/png'
  });

if (uploadError) {
  return res.status(500).json({ error: uploadError.message });
}

const { data: publicUrlData } = supabase.storage
  .from('ai-images')
  .getPublicUrl(fileName);

const imageUrl = publicUrlData.publicUrl;

      const newBalance = Number(wallet.balance) - 10;

      await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', USER_ID);

  return res.status(200).json({ imageUrl, balance: newBalance });
    }

    if (!memoryStore[name]) {
      memoryStore[name] = {
        profile,
        history: []
      };
    }

    memoryStore[name].profile = profile;

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
      return res.status(500).json({ error: JSON.stringify(data) });
    }

    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', USER_ID)
      .single();

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Hey you 😘";

    if (walletError || !wallet || Number(wallet.balance) <= 0) {
      return res.status(200).json({ reply: "No tokens left 🔒" });
    }

    await supabase
      .from('wallets')
      .update({ balance: Number(wallet.balance) - 1 })
      .eq('user_id', USER_ID);

    const insertResult = await supabase.from('chat_history').insert([
      {
        user_id: USER_ID,
        message: msg,
        role: "user"
      },
      {
        user_id: USER_ID,
        message: reply,
        role: "ai"
      }
    ]);

    console.log('CHAT_HISTORY_INSERT:', insertResult);

    replyText = reply;
    memoryStore[name].history.push(replyText);

    return res.status(200).json({ reply });

  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
