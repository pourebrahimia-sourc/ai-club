import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const USER_ID = "f5af3bfe-ef28-4f69-811b-747cc7e47fb5";

  const { data: wallet, error } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', USER_ID)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({
    balance: wallet?.balance || 0
  });
}
