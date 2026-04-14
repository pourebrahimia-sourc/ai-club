import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { amount } = req.body || {};

    if (!amount) {
      return res.status(400).json({ error: 'Missing data' });
    }

    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userData.user.id)
      .single();

    if (walletError || !wallet) {
      return res.status(400).json({
        error: walletError?.message || 'Wallet not found'
      });
    }

    const currentBalance = Number(wallet.balance);
    const deductAmount = Number(amount);

    if (currentBalance < deductAmount) {
      return res.status(400).json({ error: 'Not enough tokens' });
    }

    const newBalance = currentBalance - deductAmount;

    const { data: updatedWallet, error: updateError } = await supabase
      .from('wallets')
      .update({ balance: newBalance })
      .eq('user_id', userData.user.id)
      .select('balance')
      .single();

    if (updateError) {
      return res.status(400).json({
        error: updateError.message
      });
    }

    return res.status(200).json({
      balance: updatedWallet.balance
    });

  } catch (e) {
    return res.status(500).json({
      error: String(e)
    });
  }
}
