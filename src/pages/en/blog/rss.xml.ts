import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('blog', ({ data }) =>
    !data.draft && (!data.locale || data.locale === 'en')
  );

  // Sort by date descending
  posts.sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());

  return rss({
    title: 'OtogiDB Blog',
    description: 'Guides, analysis, and updates for Otogi: Spirit Agents',
    site: context.site!,
    items: posts.map(post => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: new Date(post.data.date),
      link: `/en/blog/${post.id}`,
      author: post.data.author,
      categories: post.data.tags,
    })),
    customData: `<language>en</language>`,
  });
}
