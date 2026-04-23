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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    type,
    email,
    password,
    name,
    returnTo,
    referralCode
  } = req.body || {};

  if ((type === 'signup' || type === 'login') && (!email || !password)) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  if (type === 'signup') {
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const trimmedName = name.trim();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: trimmedName }
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data?.user?.id) {
      return res.status(400).json({ error: 'Signup failed' });
    }

    const userId = data.user.id;

    // wallet اولیه اگر به هر دلیل توسط trigger ساخته نشده بود
    const { data: existingWallet } = await supabaseAdmin
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingWallet) {
      await supabaseAdmin
        .from('wallets')
        .insert([{ user_id: userId, balance: 10 }]);
    }

    // user row را می‌خوانیم تا referral_code قبلی trigger را خراب نکنیم
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, referral_code')
      .eq('id', userId)
      .maybeSingle();

    const finalReferralCode =
      existingUser?.referral_code || crypto.randomUUID().slice(0, 8);

    const { error: upsertUserError } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          id: userId,
          name: trimmedName,
          referral_code: finalReferralCode
        },
        { onConflict: 'id' }
      );

    if (upsertUserError) {
      return res.status(400).json({ error: upsertUserError.message });
    }

    // referral logic
    if (referralCode) {
      const cleanReferralCode = String(referralCode).trim();

      const { data: refUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('referral_code', cleanReferralCode)
        .maybeSingle();

      if (refUser && refUser.id !== userId) {
        // فقط یک بار برای هر referred user
        const { data: existingReferral } = await supabaseAdmin
          .from('referrals')
          .select('id')
          .eq('referred_id', userId)
          .maybeSingle();

        if (!existingReferral) {
          const { error: insertReferralError } = await supabaseAdmin
            .from('referrals')
            .insert([
              {
                referrer_id: refUser.id,
                referred_id: userId
              }
            ]);

          if (insertReferralError) {
            return res.status(400).json({ error: insertReferralError.message });
          }

          // +10 به یوزر جدید
          const { error: newUserRewardError } = await supabaseAdmin.rpc('add_tokens', {
            user_id_input: userId,
            amount_input: 10
          });

          if (newUserRewardError) {
            return res.status(400).json({ error: newUserRewardError.message });
          }

          // +10 به صاحب کد
          const { error: referrerRewardError } = await supabaseAdmin.rpc('add_tokens', {
            user_id_input: refUser.id,
            amount_input: 10
          });

          if (referrerRewardError) {
            return res.status(400).json({ error: referrerRewardError.message });
          }
        }
      }
    }

    return res.json({
      user: data.user,
      session: data.session || null
    });
  }

  if (type === 'login') {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({
      user: data.user,
      session: data.session || null
    });
  }

  if (type === 'update-name') {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const trimmedName = (name || '').trim();

    if (!trimmedName) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const token = authHeader.replace('Bearer ', '');

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser(token);

    if (userError || !user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          id: user.id,
          name: trimmedName
        },
        { onConflict: 'id' }
      );

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    return res.json({ success: true });
  }

  if (type === 'forgot') {
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://ai-club-one-iota.vercel.app/reset-password.html'
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ success: true });
  }

  if (type === 'update-password') {
    const {
      access_token,
      refresh_token,
      password: newPassword
    } = req.body || {};

    if (!access_token || !refresh_token || !newPassword) {
      return res.status(400).json({ error: 'Missing token or password' });
    }

    const tempSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const {
      data: { session },
      error: sessionError
    } = await tempSupabase.auth.setSession({
      access_token,
      refresh_token
    });

    if (sessionError || !session) {
      return res.status(400).json({ error: 'Invalid session' });
    }

    const { error } = await tempSupabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ success: true });
  }

  if (type === 'google') {
    const safeReturnTo =
      returnTo === 'result.html' ? 'result.html' : 'index.html';

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const redirectUrl = `${protocol}://${host}/${safeReturnTo}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ url: data.url });
  }

  return res.status(400).json({ error: 'Invalid type' });
}
