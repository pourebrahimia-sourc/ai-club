import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user?.id) return null;
  return data.user;
}

function getStoragePathFromUrl(url) {
  if (!url) return null;
  const marker = '/ai-images/';
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.substring(index + marker.length);
}

export default async function handler(req, res) {
  const user = await getUser(req);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('characters')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({
      characters: data || []
    });
  }

  if (req.method === 'DELETE') {
    const { characterId } = req.body || {};

    if (!characterId) {
      return res.status(400).json({ error: 'Missing characterId' });
    }

    const { data: character, error: findError } = await supabaseAdmin
      .from('characters')
      .select('id, image_url')
      .eq('id', characterId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (findError) {
      return res.status(400).json({ error: findError.message });
    }

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const storagePath = getStoragePathFromUrl(character.image_url);

    if (storagePath) {
      await supabaseAdmin.storage
        .from('ai-images')
        .remove([storagePath]);
    }

    const { error: deleteError } = await supabaseAdmin
.from('characters')
.update({
  deleted_at: new Date().toISOString()
})
.eq('id', characterId)
.eq('user_id', user.id);

    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
