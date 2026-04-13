import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, userId } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ error: 'Missing data' });
    }

    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
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
      .eq('user_id', userId)
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
