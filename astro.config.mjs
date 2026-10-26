// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import { unified } from "@astrojs/markdown-remark";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { DEFAULT_LOCALE, LOCALES, SITE_CONFIG } from "./src/config";

// https://astro.build/config
export default defineConfig({
    // Custom domain served from the root of GitHub Pages: no `base` needed.
    site: SITE_CONFIG.site,
    // GitHub Pages serves /blog/ from blog/index.html and redirects /blog to /blog/.
    // Always using the trailing slash keeps canonical URLs, sitemap and links consistent.
    trailingSlash: "always",
    build: { format: "directory" },

    // English is the default language (no prefix); Spanish lives under /es/.
    // The sitemap, hreflang and the language switcher are generated from the
    // content (see src/utils/feeds.ts and src/components/BaseHead.astro) because
    // article slugs differ between languages.
    i18n: {
        locales: [...LOCALES],
        defaultLocale: DEFAULT_LOCALE,
        routing: { prefixDefaultLocale: false },
    },

    markdown: {
        processor: unified({
            remarkPlugins: [remarkMath],
            rehypePlugins: [rehypeKatex],
        }),
    },
    integrations: [mdx(), react()],
    vite: {
        plugins: [tailwindcss()],
        build: {
            rollupOptions: {
                onwarn(warning, defaultHandler) {
                    if (
                        warning.code === "MODULE_LEVEL_DIRECTIVE" ||
                        (warning.message && warning.message.includes("astro:head-inject"))
                    ) {
                        return;
                    }
                    defaultHandler(warning);
                },
            },
        },
    },
});
