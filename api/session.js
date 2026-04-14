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

const { data: profile } = await supabase
  .from('users')
  .select('name')
  .eq('id', user.id)
  .maybeSingle();

const { data: wallet } = await supabase
  .from('wallets')
  .select('id')
  .eq('user_id', user.id)
  .maybeSingle();

return res.json({
  data: {
    session: {
      user,
      profileName: profile?.name || user.user_metadata?.name || 'User'
    }
  }
});
}
