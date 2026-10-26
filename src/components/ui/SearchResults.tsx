import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SpotlightCard from "@/components/ui/SpotlightCard";
import ScrollFloat from "@/components/ui/ScrollFloat";
import FadeContent from "@/components/ui/FadeContent";
import type { Locale } from "@/config";
import { getLocaleFromPath, t } from "@/i18n";

interface PagefindResult {
    url: string;
    meta: {
        title?: string;
        kind?: string;
    };
    excerpt: string;
}

interface PagefindModule {
    search: (query: string) => Promise<{ results: { data: () => Promise<PagefindResult> }[] }>;
}

declare global {
    interface Window {
        /** Pagefind module loaded for one language: Pagefind picks its index from <html lang> when it starts. */
        __pagefind?: { locale: Locale; module: PagefindModule };
    }
}

const MAX_RESULTS = 10;

/**
 * Loads the Pagefind module for a language.
 *
 * Pagefind builds one index per language (from <html lang> at build time) and
 * selects it when the module starts. A module loaded while browsing Spanish pages
 * must not be reused for English ones, so each language gets its own instance
 * (the `?lang=` query makes the browser treat it as a separate module).
 */
async function loadPagefind(locale: Locale): Promise<PagefindModule> {
    if (window.__pagefind?.locale === locale) return window.__pagefind.module;
    const path = `/pagefind/pagefind.js?lang=${locale}`;
    const module = (await import(/* @vite-ignore */ path)) as PagefindModule;
    window.__pagefind = { locale, module };
    return module;
}

export default function SearchResults({ locale }: { locale: Locale }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<PagefindResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const q = new URLSearchParams(window.location.search).get("q") ?? "";
        setQuery(q);
        if (!q.trim()) return;

        let cancelled = false;
        setIsLoading(true);
        setFailed(false);
        (async () => {
            try {
                const pagefind = await loadPagefind(locale);
                const search = await pagefind.search(q);
                const data = await Promise.all(search.results.slice(0, MAX_RESULTS * 2).map((r) => r.data()));
                // Safety net: only show pages of this language even if an index ever mixed them.
                const sameLanguage = data.filter((r) => getLocaleFromPath(new URL(r.url, window.location.origin).pathname) === locale);
                if (!cancelled) setResults(sameLanguage.slice(0, MAX_RESULTS));
            } catch (e) {
                console.error("Pagefind error:", e);
                if (!cancelled) setFailed(true);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [locale]);

    const kindLabel = (r: PagefindResult) => (r.meta?.kind === "about" ? t(locale, "search.kind.about") : t(locale, "search.kind.blog"));
    const hasQuery = query.trim() !== "";

    return (
        <div className="w-full">
            <header className="mb-12 md:mb-20">
                <div className="flex items-center justify-between gap-4 mb-12">
                    <FadeContent delay={100} duration={600}>
                        <p
                            className="text-secondary-text font-mono text-[10px] md:text-sm tracking-widest uppercase opacity-60 dark:opacity-80 whitespace-nowrap"
                            role="status"
                            aria-live="polite"
                        >
                            {!hasQuery
                                ? t(locale, "search.hint")
                                : isLoading
                                  ? t(locale, "search.querying")
                                  : t(locale, results.length === 1 ? "search.match" : "search.matches", { count: results.length })}
                        </p>
                    </FadeContent>
                </div>
            </header>

            <div className="w-full pb-32">
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col gap-24 w-full"
                        >
                            {[1, 2].map((i) => (
                                <div key={i} className="w-full min-h-[300px] rounded-3xl p-6 md:p-8 animate-pulse bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5" />
                            ))}
                        </motion.div>
                    ) : failed ? (
                        <motion.p
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-16 text-sm md:text-base text-secondary-text opacity-80 max-w-2xl"
                        >
                            {t(locale, "search.error")}
                        </motion.p>
                    ) : hasQuery && results.length > 0 ? (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.5 }}
                            className="flex flex-col gap-24 w-full"
                        >
                            {results.map((r, index) => (
                                <FadeContent key={r.url} delay={index * 100} duration={800} className="w-full">
                                    <SpotlightCard className="p-6 md:p-12 border border-black/5 dark:border-white/10">
                                        <article className="flex flex-col gap-6 group relative z-10 w-full">
                                            <div className="space-y-4">
                                                <a
                                                    href={r.url}
                                                    className="block group/link after:absolute after:inset-0 after:z-20 after:cursor-pointer"
                                                >
                                                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary-text dark:text-white group-hover/link:text-black dark:group-hover/link:text-white transition-colors leading-tight">
                                                        <ScrollFloat
                                                            text={r.meta?.title || t(locale, "search.untitled")}
                                                            className="text-2xl md:text-3xl font-bold tracking-tight"
                                                            stagger={0.03}
                                                        />
                                                    </h2>
                                                </a>
                                                <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.2em] opacity-50 dark:opacity-70 text-secondary-text">
                                                    <span>{kindLabel(r)}</span>
                                                </div>
                                            </div>
                                            <div
                                                className="search-excerpt text-sm md:text-base text-primary-text/70 dark:text-primary-text/80 leading-relaxed prose dark:prose-invert prose-p:my-0 line-clamp-3"
                                                dangerouslySetInnerHTML={{ __html: r.excerpt }}
                                            />
                                        </article>
                                    </SpotlightCard>
                                </FadeContent>
                            ))}
                        </motion.div>
                    ) : hasQuery ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-32 flex flex-col justify-center max-w-2xl"
                        >
                            <p className="text-primary-text font-serif text-3xl md:text-4xl italic mb-6 opacity-80 dark:opacity-90">
                                {t(locale, "search.emptyTitle")}
                            </p>
                            <p className="text-sm md:text-base font-sans font-light text-secondary-text leading-relaxed opacity-70 dark:opacity-80">
                                {t(locale, "search.emptyBody")}
                            </p>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>
        </div>
    );
}
