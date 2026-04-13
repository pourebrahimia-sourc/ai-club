import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, userId } = req.body;

  if (!userId || !amount) {
    return res.status(400).json({ error: 'Missing data' });
  }

  const { data: wallet, error } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (error || !wallet) {
    return res.status(400).json({ error: 'Wallet not found' });
  }

  if (Number(wallet.balance) < Number(amount)) {
    return res.status(400).json({ error: 'Not enough tokens' });
  }

  const newBalance = Number(wallet.balance) - Number(amount);

  const { error: updateError } = await supabase
    .from('wallets')
    .update({ balance: newBalance })
    .eq('user_id', userId);

  if (updateError) {
    return res.status(500).json({ error: 'Failed to update balance' });
  }

  return res.status(200).json({ balance: newBalance });
}
