import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
export default async function handler(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.json({ data: { session: null } });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
const token = authHeader.replace('Bearer ', '');
const { data, error } = await supabase.auth.getUser(token);

if (error || !data?.user) {
  return res.json({ data: { session: null } });
}

const user = data.user;
if (error) {
  return res.status(401).json({ error: 'Unauthorized' });
}
    if (error || !data.user) {
      return res.json({ data: { session: null } });
    }

    const user = data?.user || null;
const { data: existingUser } = await supabaseAdmin
  .from('users')
  .select('id')
  .eq('id', user.id)
  .maybeSingle();

await supabaseAdmin
  .from('users')
  .insert([
    {
      id: user.id,
      name: user.user_metadata?.name || 'User',
      referral_code: crypto.randomUUID().slice(0,8)
    }
  ]);
}
    // ۱. گرفتن نام از جدول کاربران
    const { data: profile } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .maybeSingle();

    // ۲. چک کردن کیف پول
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();

    let balance = wallet?.balance;

    if (!wallet) {
      // تلاش برای ساخت کیف پول با ۱۰ توکن جایزه
      const { data: newWallet, error: insertError } = await supabase
        .from('wallets')
        .insert([{ user_id: user.id, balance: 10 }])
        .select('balance')
        .single();

      if (insertError) {
        // اگر به دلیل درخواست همزمان، کیف پول قبلاً ساخته شده بود، دوباره آن را بخوان
        const { data: existingWallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();
        balance = existingWallet?.balance || 0;
      } else {
        balance = newWallet.balance;
      }
    }

    return res.json({
      data: {
        session: {
          user,
          profileName: profile?.name || user.user_metadata?.name || 'User',
          balance: balance || 0
        }
      }
    });
  } catch (e) {
    return res.json({ data: { session: null } });
  }
}
