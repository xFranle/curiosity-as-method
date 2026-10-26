import { DEFAULT_LOCALE, LOCALES, LOCALE_NAMES, type Locale } from "@/config";
import { ui, type UiKey } from "./ui";

export { DEFAULT_LOCALE, LOCALES, LOCALE_NAMES };
export type { Locale, UiKey };

export function isLocale(value: unknown): value is Locale {
    return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** The other language(s) besides `locale`. */
export function otherLocales(locale: Locale): Locale[] {
    return LOCALES.filter((l) => l !== locale);
}

/**
 * Translate a UI string. Placeholders like `{count}` are replaced from `vars`.
 * Safe to call from Astro, React and plain TypeScript.
 */
export function t(locale: Locale, key: UiKey, vars?: Record<string, string | number>): string {
    let text: string = ui[locale][key] ?? ui[DEFAULT_LOCALE][key];
    if (vars) {
        for (const [name, value] of Object.entries(vars)) {
            text = text.replaceAll(`{${name}}`, String(value));
        }
    }
    return text;
}

/** Returns a `t` bound to a locale. */
export function useTranslations(locale: Locale) {
    return (key: UiKey, vars?: Record<string, string | number>) => t(locale, key, vars);
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

/** Locale encoded in a pathname: `/es/...` is Spanish, everything else is the default. */
export function getLocaleFromPath(pathname: string): Locale {
    const first = pathname.split("/").filter(Boolean)[0];
    return isLocale(first) && first !== DEFAULT_LOCALE ? first : DEFAULT_LOCALE;
}

/** Removes the locale prefix: `/es/blog/x/` -> `/blog/x/`. */
export function removeLocale(pathname: string): string {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length && isLocale(segments[0]) && segments[0] !== DEFAULT_LOCALE) segments.shift();
    const rest = segments.join("/");
    if (!rest) return "/";
    return withTrailingSlash(`/${rest}`);
}

/** Adds a trailing slash unless the path points to a file (`/rss.xml`) or already has one. */
function withTrailingSlash(path: string): string {
    if (path.endsWith("/")) return path;
    const last = path.split("/").pop() ?? "";
    return last.includes(".") ? path : `${path}/`;
}

/**
 * Builds the URL of an unprefixed site path in a language.
 *   localizePath("es", "/blog/") -> "/es/blog/"
 *   localizePath("en", "/blog/") -> "/blog/"
 */
export function localizePath(locale: Locale, path: string = "/"): string {
    const clean = removeLocale(path.startsWith("/") ? path : `/${path}`);
    const prefixed = locale === DEFAULT_LOCALE ? clean : `/${locale}${clean === "/" ? "/" : clean}`;
    return withTrailingSlash(prefixed);
}

/** Same page in another language when the page exists under the same path in both. */
export function switchLocalePath(pathname: string, target: Locale): string {
    return localizePath(target, removeLocale(pathname));
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------
// Dates in the frontmatter (`2026-10-26`) are parsed as UTC midnight. Format
// them in UTC too, otherwise the visible day depends on the build machine's
// timezone.

export function formatDate(date: Date, locale: Locale, style: "long" | "short" = "long"): string {
    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: style === "long" ? "long" : "short",
        day: "numeric",
        timeZone: "UTC",
    }).format(date);
}

/** `2026.10.26`, used in compact lists. */
export function formatDateCompact(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}.${m}.${d}`;
}

/** Reading time in minutes, ~200 wpm. Works for both languages. */
export function readingMinutes(text: string): number {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
}
