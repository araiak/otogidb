import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blogCollection = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.string().or(z.date()),
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional().default(false),
    /** Optional image URL for social sharing (Open Graph/Twitter Card) */
    image: z.string().optional(),
    /** Locale for this post (en, ja, ko, zh-cn, zh-tw, es). Defaults to 'en'. */
    locale: z.enum(['en', 'ja', 'ko', 'zh-cn', 'zh-tw', 'es']).optional().default('en'),
  }),
});

export const collections = {
  blog: blogCollection,
};
