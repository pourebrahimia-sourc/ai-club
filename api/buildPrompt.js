export function buildImagePrompt(profile) {
  const {
    age,
    ethnicity,
    body,
    bodyDetails,
    hair,
    appearanceDetails,
    personality
  } = profile;

  // تبدیل دیتا به متن طبیعی
  const ageText = {
    "18-21": "young adult woman",
    "22-25": "young woman",
    "26-30": "mature young woman",
    "30+": "adult woman"
  }[age] || "young woman";

  const bodyMap = {
    slim: "slim body",
    fit: "fit athletic body",
    curvy: "curvy body",
    thick: "thick body"
  };

  const bodyDetailsMap = {
    small: "small chest",
    medium: "medium chest",
    large: "large chest",
    "very-large": "very large chest"
  };

  const hairMap = {
    blonde: "blonde hair",
    brunette: "brown hair",
    black: "black hair",
    red: "red hair",
    "unnatural-colors": "colorful hair",
    "no-preferences": ""
  };

  const appearanceMap = {
    tattoos: "with tattoos",
    freckles: "with freckles",
    "tooth-gap": "with a cute tooth gap",
    makeup: "wearing makeup",
    "no-makeup": "natural look, no makeup",
    "body-hair": "natural body hair"
  };

  const personalityMap = {
    soft: "soft and gentle vibe",
    wild: "playful and bold vibe",
    caring: "warm and caring vibe",
    dominant: "confident and dominant vibe"
  };

  // ساخت prompt نهایی
  const prompt = `
A highly attractive ${ageText}, ${ethnicity} woman,
${bodyMap[body] || ""},
${bodyDetailsMap[bodyDetails] || ""},
${hairMap[hair] || ""},
${appearanceMap[appearanceDetails] || ""}.

She has a ${personalityMap[personality] || "charming vibe"}.

Portrait, upper body, looking at camera,
soft lighting, realistic skin, high detail,
cinematic, 4k, vertical image, shallow depth of field.
`;

  return prompt.replace(/\n/g, " ").trim();
}
