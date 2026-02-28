import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Normalize blog row from Supabase to app post shape.
 */
function toPost(row) {
  if (!row) return null;
  const readTime = row.read_time_minutes != null
    ? `${row.read_time_minutes} min read`
    : null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    read_time_minutes: row.read_time_minutes,
    readTime: readTime || '0 min read',
    image_url: row.image_url,
    category: row.category,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Fetch all blog categories ordered by name.
 * @returns {Promise<Array<{ id: number, name: string }>>}
 */
export async function fetchBlogCategories() {
  if (!isSupabaseConfigured() || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('blog_category')
      .select('id, name')
      .order('name', { ascending: true });
    if (error) {
      console.warn('blogApi fetchBlogCategories:', error.message);
      return [];
    }
    return data ?? [];
  } catch (e) {
    console.warn('blogApi fetchBlogCategories:', e?.message);
    return [];
  }
}

/**
 * Fetch blogs, optionally by category. Only published (published_at <= now()).
 * @param {{ categoryId?: number | null, limit?: number }} opts - categoryId: filter by category; null/omit = all. limit: default 50.
 * @returns {Promise<Array>} posts in app shape
 */
export async function fetchBlogs(opts = {}) {
  const { categoryId, limit = 50 } = opts;
  if (!isSupabaseConfigured() || !supabase) return [];
  try {
    let q = supabase
      .from('blog')
      .select('id, title, slug, excerpt, content, read_time_minutes, image_url, category, published_at, created_at, updated_at')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(limit);
    if (categoryId != null && categoryId !== '') {
      q = q.eq('category', categoryId);
    }
    const { data, error } = await q;
    if (error) {
      console.warn('blogApi fetchBlogs:', error.message);
      return [];
    }
    return (data ?? []).map(toPost);
  } catch (e) {
    console.warn('blogApi fetchBlogs:', e?.message);
    return [];
  }
}

/**
 * Fetch latest blogs for home (e.g. limit 5).
 */
export async function fetchLatestBlogs(limit = 5) {
  return fetchBlogs({ limit });
}
