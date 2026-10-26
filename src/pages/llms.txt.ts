import type { APIRoute } from "astro";
import { LOCALES, LOCALE_NAMES, SITE_CONFIG } from "@/config";
import { localizePath } from "@/i18n";
import { getPosts } from "@/utils/content";

export const GET: APIRoute = async ({ site }) => {
    const origin = (site ?? new URL(SITE_CONFIG.site)).origin;
    const abs = (path: string) => `${origin}${path}`;

    const sections: string[] = [];
    for (const locale of LOCALES) {
        const posts = await getPosts(locale);
        sections.push(
            [
                `## ${LOCALE_NAMES[locale]}`,
                "",
                `- [Home](${abs(localizePath(locale, "/"))})`,
                `- [Blog](${abs(localizePath(locale, "/blog/"))})`,
                `- [RSS](${abs(localizePath(locale, "/rss.xml"))})`,
                ...posts.map((p) => `- [${p.entry.data.title}](${abs(p.path)}): ${p.entry.data.description}`),
            ].join("\n"),
        );
    }

    const body = `# ${SITE_CONFIG.title.en}

> ${SITE_CONFIG.description.en}

Every article exists in English and Spanish as two independently written versions, linked with hreflang.

${sections.join("\n\n")}
`;
    return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
