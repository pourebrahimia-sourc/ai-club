import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { type, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  // SIGN UP
  if (type === 'signup') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) return res.status(400).json({ error: error.message });

    // ساخت ولت
    await supabase.from('wallets').insert([
      {
        user_id: data.user.id,
        balance: 10
      }
    ]);

    return res.json({ user: data.user });
  }

  // LOGIN
  if (type === 'login') {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) return res.status(400).json({ error: error.message });

    return res.json({ user: data.user });
  }

  return res.status(400).json({ error: 'Invalid type' });
}
