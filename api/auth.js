import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { type, email, password, name } = req.body;

  if ((type === 'signup' || type === 'login') && (!email || !password)) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  if (type === 'signup') {
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name
        }
      }
    });

    if (error) return res.status(400).json({ error: error.message });

    await supabase.from('wallets').insert([
      {
        user_id: data.user.id,
        balance: 10
      }
    ]);

    return res.json({ user: data.user });
  }

  if (type === 'login') {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) return res.status(400).json({ error: error.message });

    return res.json({ user: data.user });
  }
if (type === 'forgot') {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://ai-club-one-iota.vercel.app/reset-password.html'
  });

  if (error) return res.status(400).json({ error: error.message });

  return res.json({ success: true });
}
  if (type === 'update-password') {
  const { access_token, refresh_token, password } = req.body;

  if (!access_token || !refresh_token || !password) {
    return res.status(400).json({ error: 'Missing token or password' });
  }

  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.setSession({
    access_token,
    refresh_token
  });

  if (sessionError || !session) {
    return res.status(400).json({ error: sessionError?.message || 'Invalid session' });
  }

  const { error } = await supabase.auth.updateUser({
    password
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({ success: true });
}
  if (type === 'google') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://ai-club-one-iota.vercel.app/result.html'
    }
  });

  if (error) return res.status(400).json({ error: error.message });

  return res.json({ url: data.url });
}
  if (type === 'update-name') {
  const { userId, name } = req.body;

  if (!userId || !name) {
    return res.status(400).json({ error: 'Missing data' });
  }

const { error } = await supabase.auth.updateUser({
  data: { name }
});

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({ success: true });
}
  return res.status(400).json({ error: 'Invalid type' });
}
