import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ===== Referral settings =====
const NEW_USER_REFERRAL_BONUS = 10;
const REFERRER_DIRECT_BONUS = 10;

const REFERRAL_A_COUNT = 2;
const REFERRAL_A_REWARD = 50;

const REFERRAL_B_COUNT = 5;
const REFERRAL_B_REWARD = 100;

const REFERRAL_C_COUNT = 10;
const REFERRAL_C_REWARD = 250;

async function applyReferralMilestones(referrerId) {
  const { count, error: countError } = await supabaseAdmin
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', referrerId);

  if (countError) {
    throw new Error(countError.message);
  }

  const totalReferrals = count || 0;

  const { data: owner, error: ownerError } = await supabaseAdmin
    .from('users')
    .select('referral_reward_a, referral_reward_b, referral_reward_c')
    .eq('id', referrerId)
    .maybeSingle();

  if (ownerError) {
    throw new Error(ownerError.message);
  }

  if (!owner) return;

  if (totalReferrals >= REFERRAL_A_COUNT && !owner.referral_reward_a) {
const { error: rewardError } = await supabaseAdmin.rpc('add_tokens', {
  user_id_input: referrerId,
  amount_input: REFERRAL_B_REWARD
});

    if (rewardError) {
      throw new Error(rewardError.message);
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ referral_reward_a: true })
      .eq('id', referrerId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  if (totalReferrals >= REFERRAL_B_COUNT && !owner.referral_reward_b) {
const { error: rewardError } = await supabaseAdmin.rpc('add_tokens', {
  user_id_input: referrerId,
  amount_input: REFERRAL_C_REWARD
});

    if (rewardError) {
      throw new Error(rewardError.message);
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ referral_reward_b: true })
      .eq('id', referrerId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  if (totalReferrals >= REFERRAL_C_COUNT && !owner.referral_reward_c) {
const { error: rewardError } = await supabaseAdmin.rpc('add_tokens', {
  user_id_input: referrerId,
  amount_input: REFERRAL_C_REWARD
});

    if (rewardError) {
      throw new Error(rewardError.message);
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ referral_reward_c: true })
      .eq('id', referrerId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }
}

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

    const { data: existingWallet, error: walletCheckError } = await supabaseAdmin
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (walletCheckError) {
      return res.status(400).json({ error: walletCheckError.message });
    }

    if (!existingWallet) {
      const { error: walletInsertError } = await supabaseAdmin
        .from('wallets')
        .insert([{ user_id: userId, balance: 10 }]);

      if (walletInsertError) {
        return res.status(400).json({ error: walletInsertError.message });
      }
    }

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from('users')
      .select('id, referral_code')
      .eq('id', userId)
      .maybeSingle();

    if (existingUserError) {
      return res.status(400).json({ error: existingUserError.message });
    }

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

    if (referralCode) {
      const cleanReferralCode = String(referralCode).trim();

      const { data: refUser, error: refUserError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('referral_code', cleanReferralCode)
        .maybeSingle();

      if (refUserError) {
        return res.status(400).json({ error: refUserError.message });
      }

      if (refUser && refUser.id !== userId) {
        const { data: existingReferral, error: existingReferralError } = await supabaseAdmin
          .from('referrals')
          .select('id')
          .eq('referred_id', userId)
          .maybeSingle();

        if (existingReferralError) {
          return res.status(400).json({ error: existingReferralError.message });
        }

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


          try {
          } catch (milestoneError) {
            return res.status(400).json({ error: milestoneError.message });
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
if (type === 'finalize-referral') {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.replace('Bearer ', '');

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser(token);

  if (userError || !user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const referralCode = req.body.referralCode;

  if (referralCode) {
    const { data: refUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('referral_code', referralCode)
      .maybeSingle();

    if (refUser && refUser.id !== user.id) {
      const { data: existingReferral } = await supabaseAdmin
        .from('referrals')
        .select('id')
        .eq('referred_id', user.id)
        .maybeSingle();

      if (!existingReferral) {
        await supabaseAdmin.from('referrals').insert([
          {
            referrer_id: refUser.id,
            referred_id: user.id
          }
        ]);

      }
    }
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
