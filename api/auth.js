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
    redirectTo: 'https://ai-club-one-iota.vercel.app/login.html'
  });

  if (error) return res.status(400).json({ error: error.message });

  return res.json({ success: true });
}
  return res.status(400).json({ error: 'Invalid type' });
}
