const PROFILE_KEYS = [
  'name',
  'age',
  'ethnicity',
  'body',
  'bodyDetails',
  'hair',
  'appearanceDetails',
  'personality'
];

function getProfile() {
  const profile = {};

  PROFILE_KEYS.forEach((key) => {
    profile[key] = localStorage.getItem(key) || '';
  });

  return profile;
}

function saveProfileField(key, value) {
  if (!PROFILE_KEYS.includes(key)) return;
  localStorage.setItem(key, value);
}

function saveMessages(messages) {
  localStorage.setItem('messages', JSON.stringify(messages || []));
}

function getMessages() {
  try {
    return JSON.parse(localStorage.getItem('messages') || '[]');
  } catch {
    return [];
  }
}

function addMessage(role, text) {
  const messages = getMessages();
  messages.push({ role, text });
  saveMessages(messages);
}

function clearMessages() {
  localStorage.removeItem('messages');
}

function clearProfile() {
  PROFILE_KEYS.forEach((key) => localStorage.removeItem(key));
}

function buildGeminiContents(profile, messages, userMessage) {
  const profileText = `
Character Profile:
Name: ${profile.name || ''}
Age: ${profile.age || ''}
Ethnicity: ${profile.ethnicity || ''}
Body Type: ${profile.body || ''}
Body Details: ${profile.bodyDetails || ''}
Hair: ${profile.hair || ''}
Appearance Details: ${profile.appearanceDetails || ''}
Personality: ${profile.personality || ''}
  `.trim();

  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: `You are an AI girlfriend. Stay fully consistent with this fixed character profile.\n\n${profileText}`
        }
      ]
    },
    {
      role: 'model',
      parts: [{ text: 'Understood. I will stay consistent with this profile.' }]
    }
  ];

  messages.forEach((msg) => {
    contents.push({
      role: msg.role,
      parts: [{ text: msg.text }]
    });
  });

  if (userMessage) {
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });
  }

  return contents;
}
