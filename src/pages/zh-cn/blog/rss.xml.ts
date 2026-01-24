import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('blog', ({ data }) =>
    !data.draft && data.locale === 'zh-cn'
  );

  // Sort by date descending
  posts.sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());

  return rss({
    title: 'OtogiDB 博客',
    description: 'Otogi: Spirit Agents 攻略、分析和更新',
    site: context.site!,
    items: posts.map(post => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: new Date(post.data.date),
      link: `/zh-cn/blog/${post.id}`,
      author: post.data.author,
      categories: post.data.tags,
    })),
    customData: `<language>zh-CN</language>`,
  });
}
