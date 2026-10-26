import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import { LOCALES } from "./config";

/**
 * Content is organised by language:
 *
 *   src/content/blog/en/my-article.mdx      -> /blog/my-article/
 *   src/content/blog/es/mi-articulo.mdx     -> /es/blog/mi-articulo/
 *
 * The folder decides the language. The two versions of an article are linked by
 * the same `translationKey` in their frontmatter. Slugs may differ per language.
 *
 * The entry id is always `<locale>/<slug>`; the slug comes from the optional
 * `slug` frontmatter field, otherwise from the file name.
 */
function generateId({ entry, data }: { entry: string; data: Record<string, unknown> }): string {
    const [locale, ...rest] = entry.replace(/\\/g, "/").split("/");
    const file = rest.join("/").replace(/\.(md|mdx)$/, "");
    const slug = typeof data.slug === "string" && data.slug ? data.slug : file;
    return `${locale}/${slug}`;
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const copyright = z
    .object({
        enabled: z.boolean().optional(),
        declaration: z.string().optional(),
    })
    .optional();

const blog = defineCollection({
    loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/blog", generateId }),
    schema: z.object({
        title: z.string(),
        description: z.string(),
        /** Text used on the social cards. Falls back to `description`. */
        shareExcerpt: z.string().max(400).optional(),
        /** Same value in the English and Spanish file of one article. */
        translationKey: z.string().regex(slugPattern, "Use lowercase letters, numbers and hyphens"),
        /** Optional. If present it must match the folder (en / es). */
        lang: z.enum(LOCALES).optional(),
        /** Optional URL slug. Defaults to the file name. */
        slug: z.string().regex(slugPattern, "Use lowercase letters, numbers and hyphens").optional(),
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        author: z.string().optional(),
        /** Optional cover image path under /public, e.g. /images/cover.jpg */
        cover: z.string().optional(),
        coverAlt: z.string().optional(),
        category: z.string(),
        tags: z.array(z.string()).default([]),
        /** Free text shown next to the category, e.g. "Long read". Optional. */
        depth: z.string().optional(),
        /** Overrides the computed reading time, e.g. "12 min". */
        readingTime: z.string().optional(),
        /** Drafts are visible in `pnpm dev` and hidden in production builds. */
        draft: z.boolean().default(false),
        copyright,
    }),
});

const pages = defineCollection({
    loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/pages", generateId }),
    schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        translationKey: z.string().regex(slugPattern).optional(),
        lang: z.enum(LOCALES).optional(),
        slug: z.string().regex(slugPattern).optional(),
    }),
});

export const collections = { blog, pages };
