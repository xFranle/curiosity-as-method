/**
 * Central site configuration.
 *
 * Everything personal about the blog lives here: name, author, domain, social
 * links, footer text and social-card preferences. Components never hard-code
 * these values. Edit this file, rebuild, done.
 *
 */

// ---------------------------------------------------------------------------
// Languages
// ---------------------------------------------------------------------------
// English is the default language (no URL prefix: /blog/my-article/).
// Spanish lives under /es/ (/es/blog/mi-articulo/).
export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Human readable language names, shown in the language switcher a11y labels. */
export const LOCALE_NAMES: Record<Locale, string> = {
    en: "English",
    es: "Español",
};

/** `og:locale` values (Open Graph uses language_TERRITORY). */
export const OG_LOCALES: Record<Locale, string> = {
    en: "en_US",
    es: "es_AR",
};

type Localized = Record<Locale, string>;

// ---------------------------------------------------------------------------
// Site
// ---------------------------------------------------------------------------
export const SITE_CONFIG = {
    /** Canonical origin. No trailing slash. Used for canonical URLs, sitemap, RSS and social cards. */
    site: "https://franle.blog",

    /** Blog name, per language. */
    title: {
        en: "Curiosity as Method",
        es: "La curiosidad como método",
    } as Localized,

    /** One-line description used in meta tags, RSS and the home page. */
    description: {
        en: "On how we think, what we believe, and what we do not yet understand.",
        es: "Sobre cómo pensamos, lo que creemos y aquello que todavía no comprendemos.",
    } as Localized,

    /** Author name, shown on the home page, in articles, JSON-LD and cards. */
    author: "Franle",
    /** Handwritten-style signature on the home page. Falls back to `author`. */
    signature: "Franle",

    /** Monochrome mark used by the navigation bar (rendered as a CSS mask) and as favicon. */
    logoSrc: "/favicon.svg",

    postsPerPage: 6,

    /** Primary navigation. `key` selects the translated label (see src/i18n/ui.ts). */
    nav: [
        { key: "blog", href: "/blog/" },
        { key: "about", href: "/about/" },
    ] as const,

    /**
     * Where the home page invites readers to go next.
     * `key` selects the translated label.
     */
    homepage: {
        harmonicSystem: {
            seed: 2026,
            speed: 0.0042,
        },
        links: [
            { key: "readBlog", href: "/blog/" },
            { key: "aboutMe", href: "/about/" },
        ] as const,
    },

    /**
     * Social profiles and contact.
     * While this list is empty, the "Elsewhere" page and its footer link are hidden.
     *
     * Example:
     *   { name: "Instagram", handle: "@yourhandle", url: "https://instagram.com/yourhandle" },
     *   { name: "Mail", handle: "hello@franle.blog", url: "mailto:hello@franle.blog" },
     * `name` selects the icon (X, GitHub, Instagram, Mail, LinkedIn, ...).
     */
    elsewhere: [] as { name: string; handle?: string; url: string }[],

    footer: {
        /** Text after "© <year>". */
        copyright: {
            en: "Franle. Curiosity as Method.",
            es: "Franle. La curiosidad como método.",
        } as Localized,
    },

    /** Copyright block at the end of each article. Overridable per article in the frontmatter. */
    articleCopyright: {
        enabled: true,
        /** Reuse terms shown under each article. */
        declaration: {
            en: "If you share or quote this essay, please credit the author and link back to the original.",
            es: "Si compartís o citás este ensayo, mencioná al autor y enlazá el original.",
        } as Localized,
    },

    /**
     * Social cards generated at build time (Open Graph 1200x630 and
     * Instagram Story 1080x1920). Colors follow the theme's palette.
     */
    socialCard: {
        /** Show the publication date on the cards. */
        showDate: true,
        /** Small USA / Argentina flags when the article exists in both English and Spanish. */
        showFlags: true,
        /** Light and dark variants of the Story/OG card. Both are always generated. */
        light: {
            background: "#FAFAFA",
            surface: "#FFFFFF",
            text: "#050505",
            muted: "#555555",
            border: "rgba(0, 0, 0, 0.10)",
        },
        dark: {
            background: "#0A0A0A",
            surface: "#141414",
            text: "#F5F5F5",
            muted: "#B5B5B5",
            border: "rgba(255, 255, 255, 0.14)",
        },
        /** Max characters taken from the excerpt before trimming at a word boundary. */
        maxExcerptChars: 220,
    },
};

export type NavKey = (typeof SITE_CONFIG.nav)[number]["key"];
