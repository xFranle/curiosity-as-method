import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { DEFAULT_LOCALE, LOCALES, SITE_CONFIG, type Locale } from "@/config";
import { localizePath } from "@/i18n";
import { getAllPosts, getPages, getPosts, type Alternates } from "@/utils/content";
import { cardPath } from "@/utils/social-card";

/** RSS feed with the articles of one language. */
export async function buildRss(locale: Locale, context: APIContext) {
    const posts = await getPosts(locale);
    return rss({
        title: SITE_CONFIG.title[locale],
        description: SITE_CONFIG.description[locale],
        site: context.site ?? SITE_CONFIG.site,
        customData: `<language>${locale}</language>`,
        items: posts.map((post) => ({
            title: post.entry.data.title,
            pubDate: post.entry.data.pubDate,
            description: post.entry.data.description,
            link: post.path,
            categories: [post.entry.data.category, ...post.entry.data.tags],
        })),
    });
}

// ---------------------------------------------------------------------------
// Sitemap
// ---------------------------------------------------------------------------

interface SitemapUrl {
    path: string;
    lastmod?: Date;
    alternates?: Alternates;
    image?: string;
}

const escapeXml = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Every indexable URL with its language alternates, lastmod and social image. */
export async function collectSitemapUrls(): Promise<SitemapUrl[]> {
    const posts = await getAllPosts();
    const pages = await getPages();
    const urls: SitemapUrl[] = [];

    const latest = (list: typeof posts) =>
        list.length
            ? new Date(Math.max(...list.map((p) => (p.entry.data.updatedDate ?? p.entry.data.pubDate).valueOf())))
            : undefined;

    const inEveryLocale = (path: string): Alternates =>
        Object.fromEntries(LOCALES.map((l) => [l, localizePath(l, path)])) as Alternates;

    // Home and blog index exist in every language.
    for (const locale of LOCALES) {
        const localePosts = posts.filter((p) => p.locale === locale);
        const lastmod = latest(localePosts);
        urls.push({ path: localizePath(locale, "/"), lastmod, alternates: inEveryLocale("/") });
        urls.push({ path: localizePath(locale, "/blog/"), lastmod, alternates: inEveryLocale("/blog/") });

        // Further index pages are not translations of each other.
        const lastPage = Math.max(1, Math.ceil(localePosts.length / SITE_CONFIG.postsPerPage));
        for (let n = 2; n <= lastPage; n++) {
            urls.push({ path: localizePath(locale, `/blog/${n}/`), lastmod });
        }
    }

    const postAlternates = new Map<string, Alternates>();
    for (const p of posts) {
        const alt = postAlternates.get(p.key) ?? {};
        alt[p.locale] = p.path;
        postAlternates.set(p.key, alt);
    }
    for (const post of posts) {
        urls.push({
            path: post.path,
            lastmod: post.entry.data.updatedDate ?? post.entry.data.pubDate,
            alternates: postAlternates.get(post.key),
            image: cardPath(post.locale, post.slug, "og"),
        });
    }

    const pageAlternates = new Map<string, Alternates>();
    for (const p of pages) {
        const alt = pageAlternates.get(p.key) ?? {};
        alt[p.locale] = p.path;
        pageAlternates.set(p.key, alt);
    }
    for (const page of pages) {
        urls.push({ path: page.path, alternates: pageAlternates.get(page.key) });
    }

    if (SITE_CONFIG.elsewhere.length > 0) {
        for (const locale of LOCALES) {
            urls.push({ path: localizePath(locale, "/elsewhere/"), alternates: inEveryLocale("/elsewhere/") });
        }
    }
    return urls;
}

/** sitemap.xml with xhtml:link hreflang alternates (only between pages that really are translations). */
export async function buildSitemap(origin: URL | string): Promise<string> {
    const abs = (path: string) => new URL(path, origin).toString();
    const urls = await collectSitemapUrls();

    const entries = urls.map((u) => {
        const alt = u.alternates ?? {};
        const present = LOCALES.filter((l) => alt[l]);
        const links =
            present.length > 1
                ? [
                      ...present.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${escapeXml(abs(alt[l]!))}"/>`),
                      ...(alt[DEFAULT_LOCALE]
                          ? [`    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(abs(alt[DEFAULT_LOCALE]!))}"/>`]
                          : []),
                  ]
                : [];
        return [
            "  <url>",
            `    <loc>${escapeXml(abs(u.path))}</loc>`,
            ...(u.lastmod ? [`    <lastmod>${isoDate(u.lastmod)}</lastmod>`] : []),
            ...links,
            ...(u.image ? [`    <image:image><image:loc>${escapeXml(abs(u.image))}</image:loc></image:image>`] : []),
            "  </url>",
        ].join("\n");
    });

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
        ...entries,
        "</urlset>",
        "",
    ].join("\n");
}
