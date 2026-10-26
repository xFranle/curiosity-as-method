import type { PaginateFunction } from "astro";
import { SITE_CONFIG, type Locale } from "@/config";
import { getPages, getPosts } from "@/utils/content";

/** Paginated blog index for one language. Page 1 is generated even when there are no posts. */
export async function blogIndexPaths(locale: Locale, paginate: PaginateFunction) {
    const posts = await getPosts(locale);
    return paginate(posts, { pageSize: SITE_CONFIG.postsPerPage });
}

/** One page per post of a language, with its neighbours (same language) for prev/next links. */
export async function postPaths(locale: Locale) {
    const posts = await getPosts(locale);
    return posts.map((post, i) => ({
        params: { slug: post.slug },
        props: {
            post,
            nextPost: i > 0 ? posts[i - 1] : null,
            prevPost: i < posts.length - 1 ? posts[i + 1] : null,
        },
    }));
}

/** Standalone pages (about, ...) of a language. */
export async function pagePaths(locale: Locale) {
    const pages = await getPages(locale);
    return pages.map((page) => ({ params: { slug: page.slug }, props: { page } }));
}
