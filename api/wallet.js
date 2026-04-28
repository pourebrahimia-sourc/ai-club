import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.replace('Bearer ', '');

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: wallet, error } = await supabase
    .from('wallets')
    .select('balance, daily_tokens, daily_token_date')
    .eq('user_id', userData.user.id)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
const today = new Date().toISOString().split('T')[0];

let finalBalance = wallet?.balance || 0;

if (wallet?.daily_token_date === today) {
  finalBalance += wallet?.daily_tokens || 0;
}
  return res.status(200).json({
    balance: finalBalance,
    userId: userData.user.id
  });
}
