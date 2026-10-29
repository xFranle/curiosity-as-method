import type { APIRoute, GetStaticPaths } from "astro";
import { LOCALES, SITE_CONFIG } from "@/config";
import { getAllPosts, getTranslations } from "@/utils/content";
import { loadCardImage } from "@/utils/card-image";
import { CARD_KINDS, renderCard, type CardContent, type CardKind } from "@/utils/social-card";

/**
 * Generates every social card at build time:
 *
 *   /og/<locale>/<slug>/og.png          1200x630   Open Graph / link previews
 *   /og/<locale>/<slug>/story.png       1080x1920  Instagram Story, light
 *   /og/<locale>/<slug>/story-dark.png  1080x1920  Instagram Story, dark
 *   /og/<locale>/default.png            1200x630   pages that are not an article
 *
 * Each article gets cards from its own language version, with its cover (or first) image
 * shown whole. Nothing is requested from any external service.
 */
export const getStaticPaths = (async () => {
    const posts = await getAllPosts();

    const articleCards = (
        await Promise.all(
            posts.map(async (post) => {
                const translations = await getTranslations(post.key);
                const content: CardContent = {
                    languages: LOCALES.filter((locale) => translations[locale]),
                    locale: post.locale,
                    title: post.entry.data.title,
                    excerpt: post.entry.data.shareExcerpt ?? post.entry.data.description,
                    date: post.entry.data.pubDate,
                    image: await loadCardImage(post.entry.body, post.entry.data.cover),
                };
                return CARD_KINDS.map((kind) => ({
                    params: { path: `${post.locale}/${post.slug}/${kind}` },
                    props: { kind, content },
                }));
            }),
        )
    ).flat();

    const siteCards = LOCALES.map((locale) => ({
        params: { path: `${locale}/default` },
        props: {
            kind: "og" as CardKind,
            content: {
                locale,
                languages: LOCALES,
                title: SITE_CONFIG.title[locale],
                excerpt: SITE_CONFIG.description[locale],
            } satisfies CardContent,
        },
    }));

    return [...articleCards, ...siteCards];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
    const { kind, content } = props as { kind: CardKind; content: CardContent };
    const png = await renderCard(kind, content);
    return new Response(new Uint8Array(png), {
        headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=31536000, immutable",
        },
    });
};
