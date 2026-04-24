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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser(token);

    if (userError || !user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: currentUser, error: currentUserError } = await supabaseAdmin
      .from('users')
      .select('referral_code')
      .eq('id', user.id)
      .maybeSingle();

    if (currentUserError) {
      return res.status(400).json({ error: currentUserError.message });
    }

    let referralCode = currentUser?.referral_code || null;

    if (!referralCode) {
      referralCode = crypto.randomUUID().slice(0, 8);

      const { error: upsertError } = await supabaseAdmin
        .from('users')
        .upsert(
          {
            id: user.id,
            name: user.user_metadata?.name || 'User',
            referral_code: referralCode
          },
          { onConflict: 'id' }
        );

      if (upsertError) {
        return res.status(400).json({ error: upsertError.message });
      }
    }

    const { data: referrals, error: referralsError } = await supabaseAdmin
      .from('referrals')
      .select('referred_id, created_at')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (referralsError) {
      return res.status(400).json({ error: referralsError.message });
    }

    const referredIds = (referrals || [])
      .map(r => r.referred_id)
      .filter(Boolean);

let avatars = [];

if (referredIds.length) {
  const { data: usersData, error: usersError } = await supabaseAdmin
    .from('users')
    .select('id')
    .in('id', referredIds);

  if (usersError) {
    return res.status(400).json({ error: usersError.message });
  }

  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();

  avatars = referredIds.map(id => {
    const authUser = authUsers.users.find(u => u.id === id);

    return {
      userId: id,
      avatarUrl: authUser?.user_metadata?.avatar_url || null
    };
  }).slice(0, 5);
}

    return res.status(200).json({
      referralCode,
      referralCount: referrals?.length || 0,
      avatars
    });

  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
