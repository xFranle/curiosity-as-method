import { getCollection, type CollectionEntry } from "astro:content";
import { LOCALES, type Locale } from "@/config";
import { isLocale, localizePath, readingMinutes, t } from "@/i18n";

export type BlogEntry = CollectionEntry<"blog">;
export type PageEntry = CollectionEntry<"pages">;

/** A blog entry with its language, slug and public URL resolved. */
export interface Post {
    entry: BlogEntry;
    locale: Locale;
    slug: string;
    /** Links the English and Spanish versions of one article. */
    key: string;
    /** Public path, e.g. `/es/blog/mi-articulo/`. */
    path: string;
}

export interface Page {
    entry: PageEntry;
    locale: Locale;
    slug: string;
    key: string;
    path: string;
}

export type Alternates = Partial<Record<Locale, string>>;

function parseId(id: string, collection: string): { locale: Locale; slug: string } {
    const [locale, ...rest] = id.split("/");
    if (!isLocale(locale) || rest.length === 0) {
        throw new Error(
            `[content] "${collection}/${id}" is not inside a language folder. ` +
                `Put it under src/content/${collection}/${LOCALES.join("/ or src/content/" + collection + "/")}/.`,
        );
    }
    return { locale, slug: rest.join("/") };
}

export function postPath(locale: Locale, slug: string): string {
    return localizePath(locale, `/blog/${slug}/`);
}

function toPost(entry: BlogEntry): Post {
    const { locale, slug } = parseId(entry.id, "blog");
    if (entry.data.lang && entry.data.lang !== locale) {
        throw new Error(
            `[content] blog/${entry.id}: frontmatter lang "${entry.data.lang}" does not match its folder "${locale}".`,
        );
    }
    return { entry, locale, slug, key: entry.data.translationKey, path: postPath(locale, slug) };
}

function toPage(entry: PageEntry): Page {
    const { locale, slug } = parseId(entry.id, "pages");
    if (entry.data.lang && entry.data.lang !== locale) {
        throw new Error(
            `[content] pages/${entry.id}: frontmatter lang "${entry.data.lang}" does not match its folder "${locale}".`,
        );
    }
    return {
        entry,
        locale,
        slug,
        key: entry.data.translationKey ?? slug,
        path: localizePath(locale, `/${slug}/`),
    };
}

// Drafts show in `pnpm dev`, or in a build run with INCLUDE_DRAFTS=1 (to preview them as a full site).
const showDrafts = import.meta.env.DEV || process.env.INCLUDE_DRAFTS === "1";

let postsPromise: Promise<Post[]> | undefined;

/** Every published post in every language, newest first. Validated once per build. */
export function getAllPosts(): Promise<Post[]> {
    postsPromise ??= (async () => {
        const entries = await getCollection("blog", ({ data }) => showDrafts || !data.draft);
        const posts = entries
            .map(toPost)
            .sort((a, b) => b.entry.data.pubDate.valueOf() - a.entry.data.pubDate.valueOf());
        assertConsistent(posts);
        return posts;
    })();
    return postsPromise;
}

/** Posts of one language, newest first. */
export async function getPosts(locale: Locale): Promise<Post[]> {
    return (await getAllPosts()).filter((p) => p.locale === locale);
}

/** Every language version of the article identified by `key`. */
export async function getTranslations(key: string): Promise<Partial<Record<Locale, Post>>> {
    const result: Partial<Record<Locale, Post>> = {};
    for (const post of await getAllPosts()) {
        if (post.key === key) result[post.locale] = post;
    }
    return result;
}

/** Public path of each existing language version (the article itself included). */
export async function getPostAlternates(post: Post): Promise<Alternates> {
    const translations = await getTranslations(post.key);
    const out: Alternates = {};
    for (const locale of LOCALES) {
        const found = translations[locale];
        if (found) out[locale] = found.path;
    }
    return out;
}

/** Fails the build on mistakes that would silently produce wrong links. */
function assertConsistent(posts: Post[]): void {
    const seen = new Map<string, Post>();
    for (const post of posts) {
        const id = `${post.locale}:${post.key}`;
        const other = seen.get(id);
        if (other) {
            throw new Error(
                `[content] translationKey "${post.key}" is used twice in "${post.locale}": ` +
                    `blog/${other.entry.id} and blog/${post.entry.id}.`,
            );
        }
        seen.set(id, post);
    }
    const missing = posts.filter((p) => LOCALES.some((l) => !seen.has(`${l}:${p.key}`)));
    for (const post of missing) {
        const absent = LOCALES.filter((l) => !seen.has(`${l}:${post.key}`));
        console.warn(`[content] "${post.entry.id}" has no ${absent.join(", ")} version yet (translationKey "${post.key}").`);
    }
}

export async function getPages(locale?: Locale): Promise<Page[]> {
    const pages = (await getCollection("pages")).map(toPage);
    return locale ? pages.filter((p) => p.locale === locale) : pages;
}

export async function getPage(locale: Locale, slug: string): Promise<Page | undefined> {
    return (await getPages(locale)).find((p) => p.slug === slug);
}

/** Path of the same page in the other languages, only where it exists. */
export async function getPageAlternates(page: Page): Promise<Alternates> {
    const out: Alternates = {};
    for (const p of await getPages()) {
        if (p.key === page.key) out[p.locale] = p.path;
    }
    return out;
}

export function postReadingTime(post: Post, locale: Locale): string {
    if (post.entry.data.readingTime) return post.entry.data.readingTime;
    return t(locale, "post.readingTime", { minutes: readingMinutes(post.entry.body ?? "") });
}

