import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.json({ data: { session: null } });
  }

  const token = authHeader.replace('Bearer ', '');

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.json({ data: { session: null } });
  }

  const user = data.user;

  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!wallet) {
    await supabase.from('wallets').insert([
      {
        user_id: user.id,
        balance: 10
      }
    ]);
  }

  return res.json({
    data: {
      session: {
        user
      }
    }
  });
}
