/**
 * Supabase Auth foydalanuvchisini store formatiga o‘giradi.
 * user_metadata (full_name, avatar_url) login/keyin ham saqlanadi.
 * @param {import('@supabase/supabase-js').User | null} u
 * @returns {{ id: string, email: string, full_name?: string, avatar_url?: string } | null}
 */
export function mapSupabaseUserToStore(u) {
  if (!u) return null;
  const meta = u.user_metadata || {};
  return {
    id: u.id,
    email: u.email || '',
    full_name: meta.full_name ?? meta.name ?? null,
    avatar_url: meta.avatar_url ?? null,
  };
}
