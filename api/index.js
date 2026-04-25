import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function getAuthedUserId(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user?.id) return null;
  return data.user.id;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { msg, name, profile, history = [], characterId = null } = req.body || {};
    const USER_ID = await getAuthedUserId(req);

    if (!USER_ID) {
      return res.status(401).json({ error: "No user" });
    }

    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', USER_ID)
      .single();

    if (walletError || !wallet) {
      return res.status(400).json({ error: "Wallet not found" });
    }

    if (msg === "generate image") {
      const { data: updatedImageBalance, error: deductImageError } = await supabase.rpc('deduct_tokens', {
        user_id_input: USER_ID,
        amount_input: 10
      });

      if (deductImageError) {
        return res.status(500).json({ error: deductImageError.message });
      }

      if (updatedImageBalance === null) {
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

const { data: insertedCharacter, error: insertCharacterError } = await supabase
  .from('characters')
  .insert([
    {
      user_id: USER_ID,
      image_url: imageUrl,
      age: profile?.age || null,
      ethnicity: profile?.ethnicity || null,
      body: profile?.body || null,
      body_details: profile?.bodyDetails || null,
      hair: profile?.hair || null,
      appearance_details: profile?.appearanceDetails || null,
      personality: profile?.personality || null,
      name: name || 'AI'
    }
  ])
  .select('id')
  .single();

if (insertCharacterError || !insertedCharacter?.id) {
  return res.status(500).json({ error: 'Character save failed' });
}

const CHARACTER_ID = insertedCharacter.id;
      return res.status(200).json({
  imageUrl,
  balance: updatedImageBalance,
  characterId: CHARACTER_ID
});
    }

    if (Number(wallet.balance) <= 0) {
      return res.status(200).json({ reply: "No tokens left 🔒" });
    }

    const savedProfile = profile || {};
    const normalizedHistory = Array.isArray(history)
      ? history.slice(-8).filter(item => item?.role && item?.parts?.[0]?.text)
      : [];
    const limitedHistory = normalizedHistory;

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
      ...limitedHistory,
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

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Hey you 😘";

    const { data: updatedChatBalance, error: deductChatError } = await supabase.rpc('deduct_tokens', {
      user_id_input: USER_ID,
      amount_input: 1
    });

    if (deductChatError) {
      return res.status(500).json({ error: deductChatError.message });
    }

    if (updatedChatBalance === null) {
      return res.status(200).json({ reply: "No tokens left 🔒" });
    }
let CHARACTER_ID = characterId || null;

if (!CHARACTER_ID) {
  const { data: latestCharacter } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', USER_ID)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  CHARACTER_ID = latestCharacter?.id || null;
}

await supabase.from('chat_history').insert([
  {
    user_id: USER_ID,
    message: msg,
    role: "user",
    character_id: CHARACTER_ID
  },
  {
    user_id: USER_ID,
    message: reply,
    role: "ai",
    character_id: CHARACTER_ID
  }
]);
// 🔥 finalize referral after first chat
const { data: existingReferral } = await supabase
  .from('referrals')
  .select('id')
  .eq('referred_id', USER_ID)
  .maybeSingle();

if (existingReferral) {
  const { data: alreadyRewarded } = await supabase
    .from('users')
    .select('referral_reward_a')
    .eq('id', USER_ID)
    .maybeSingle();

  if (!alreadyRewarded?.referral_reward_a) {
    // give tokens to both users
    await supabase.rpc('add_tokens', {
      user_id_input: USER_ID,
      amount_input: 10
    });

    const { data: refRow } = await supabase
      .from('referrals')
      .select('referrer_id')
      .eq('referred_id', USER_ID)
      .maybeSingle();

    if (refRow?.referrer_id) {
      await supabase.rpc('add_tokens', {
        user_id_input: refRow.referrer_id,
        amount_input: 10
      });
    }

    await supabase
      .from('users')
      .update({ referral_reward_a: true })
      .eq('id', USER_ID);
  }
}
    return res.status(200).json({ reply, balance: updatedChatBalance });

  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
