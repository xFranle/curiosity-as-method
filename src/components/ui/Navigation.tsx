import { useState, useRef, useEffect, Fragment } from "react";
import { navigate } from "astro:transitions/client";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { RiSearchLine, RiCloseLine } from "@remixicon/react";
import { DEFAULT_LOCALE, LOCALES, LOCALE_NAMES, type Locale } from "@/config";
import { getLocaleFromPath, isLocale, localizePath, removeLocale, t } from "@/i18n";
import type { UiKey } from "@/i18n";

interface NavItem {
    key: string;
    href: string;
}

type Alternates = Partial<Record<Locale, string>>;

interface NavigationProps {
    title: string;
    logoSrc?: string;
    navItems: readonly NavItem[];
    pathname?: string;
    locale: Locale;
    /** Path of the current page in each language where it exists. */
    alternates?: Alternates;
}

const LOCALE_STORAGE_KEY = "locale";

/** Reads the language alternates the page declares for search engines (`<link rel="alternate" hreflang>`). */
function readAlternatesFromHead(): Alternates {
    const out: Alternates = {};
    document.head.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]:not([type])').forEach((link) => {
        const code = link.getAttribute("hreflang");
        if (isLocale(code)) out[code] = new URL(link.href).pathname;
    });
    return out;
}

function rememberLocale(locale: Locale) {
    try {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
        /* storage unavailable (private mode): the switcher still works */
    }
}

export default function Navigation({
    title,
    logoSrc,
    navItems,
    pathname = "",
    locale: initialLocale,
    alternates: initialAlternates = {},
}: NavigationProps) {
    // The component is persisted across page transitions (transition:persist), so its
    // props only describe the first page. Language and alternates are re-read from the
    // document after every navigation.
    const [locale, setLocale] = useState<Locale>(initialLocale);
    const [alternates, setAlternates] = useState<Alternates>(initialAlternates);
    const [currentPath, setCurrentPath] = useState(pathname);
    const [isSearchActive, setIsSearchActive] = useState(currentPath.includes("/search"));
    const [searchQuery, setSearchQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const tr = (key: UiKey, vars?: Record<string, string | number>) => t(locale, key, vars);

    // Listen for Astro page navigations when using transition:persist
    useEffect(() => {
        const sync = () => {
            setCurrentPath(window.location.pathname);
            const lang = document.documentElement.lang;
            setLocale(isLocale(lang) ? lang : getLocaleFromPath(window.location.pathname));
            setAlternates(readAlternatesFromHead());
        };
        document.addEventListener("astro:after-swap", sync);
        document.addEventListener("astro:page-load", sync);
        return () => {
            document.removeEventListener("astro:after-swap", sync);
            document.removeEventListener("astro:page-load", sync);
        };
    }, []);

    // Remembered language: only applied when someone opens the bare site root, never
    // when they arrive on a specific URL (that language was chosen explicitly) or
    // navigate from inside the site.
    useEffect(() => {
        try {
            const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
            const cameFromSite = document.referrer && new URL(document.referrer).origin === window.location.origin;
            if (isLocale(stored) && stored !== DEFAULT_LOCALE && window.location.pathname === "/" && !cameFromSite) {
                window.location.replace(localizePath(stored, "/"));
            }
        } catch {
            /* ignore */
        }
    }, []);

    // Handle initial query population on client side
    useEffect(() => {
        if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search);
            const q = urlParams.get("q");
            if (q) setSearchQuery(q);
        }
    }, []);

    // Focus input when search becomes active (only if it wasn't active on mount)
    useEffect(() => {
        if (isSearchActive && inputRef.current && !currentPath.includes("/search")) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isSearchActive, currentPath]);

    // Handle global Cmd+K shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsSearchActive(true);
            }
            if (e.key === "Escape" && isSearchActive) {
                setIsSearchActive(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isSearchActive]);

    const handleSearchSubmit = (e: { preventDefault: () => void }) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`${localizePath(locale, "/search/")}?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    const homeHref = localizePath(locale, "/");
    const barePath = removeLocale(currentPath);

    return (
        <>
            {/* Minimalist Top Navigation (Left/Right Layout) */}
            <header className="absolute top-0 left-0 w-full z-50 pointer-events-none transition-colors duration-300">
                <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-8 sm:pt-10 grid grid-cols-[1fr_auto] md:flex md:flex-nowrap md:items-center md:justify-between pointer-events-auto gap-y-5 md:gap-y-0 md:gap-8">
                    {/* 1. Logo (Always Top Left) */}
                    <div className="col-start-1 row-start-1 flex items-center shrink-0 order-1">
                        {logoSrc ? (
                            <a href={homeHref} className="block relative group outline-none" aria-label={`${title} — ${tr("nav.home")}`}>
                                <div
                                    className="h-[18px] sm:h-[22px] aspect-[1.446] bg-current text-primary-text dark:text-white opacity-85 dark:opacity-100 hover:scale-[1.04] transition-all duration-300 ease-out"
                                    style={{
                                        WebkitMaskImage: `url(${logoSrc})`,
                                        WebkitMaskSize: "contain",
                                        WebkitMaskRepeat: "no-repeat",
                                        WebkitMaskPosition: "left center",
                                        maskImage: `url(${logoSrc})`,
                                        maskSize: "contain",
                                        maskRepeat: "no-repeat",
                                        maskPosition: "left center",
                                    }}
                                />
                            </a>
                        ) : (
                            <a
                                href={homeHref}
                                className="text-sm font-medium text-primary-text dark:text-white hover:opacity-80 transition-opacity block px-2 py-1"
                            >
                                {title}
                            </a>
                        )}
                    </div>

                    {/* 2. Controls: Search Trigger, Language & Theme Toggle (Mobile Top Right, Desktop Rightmost) */}
                    <div className="col-start-2 row-start-1 flex items-center justify-end gap-4 sm:gap-6 order-3 shrink-0">
                        <button
                            onClick={() => setIsSearchActive(!isSearchActive)}
                            className="opacity-60 hover:opacity-100 dark:opacity-90 dark:hover:opacity-100 transition-opacity cursor-pointer text-primary-text dark:text-white md:hidden"
                            aria-label={isSearchActive ? tr("nav.searchClose") : tr("nav.searchOpen")}
                        >
                            {isSearchActive ? <RiCloseLine className="w-4 h-4" /> : <RiSearchLine className="w-4 h-4" />}
                        </button>

                        {/* Divider */}
                        <div className="hidden md:block w-px h-4 bg-black/15 dark:bg-white/30" />

                        {/* Language switcher */}
                        <div
                            role="group"
                            aria-label={tr("nav.language")}
                            className="flex items-center gap-1.5 font-mono text-[11px] sm:text-xs uppercase tracking-widest text-primary-text dark:text-white"
                        >
                            {LOCALES.map((code, index) => {
                                const isCurrent = code === locale;
                                const translated = alternates[code];
                                const href = translated ?? localizePath(code, "/blog/");
                                const unavailable = tr("nav.langUnavailable", { language: tr(`lang.${code}` as UiKey) });
                                return (
                                    <Fragment key={code}>
                                        {index > 0 && <span className="opacity-30 select-none">/</span>}
                                        {isCurrent ? (
                                            <span
                                                lang={code}
                                                aria-current="true"
                                                title={LOCALE_NAMES[code]}
                                                className="opacity-100 font-medium px-0.5 py-1"
                                            >
                                                {code}
                                            </span>
                                        ) : (
                                            <a
                                                href={href}
                                                hrefLang={code}
                                                lang={code}
                                                onClick={() => rememberLocale(code)}
                                                aria-label={translated ? LOCALE_NAMES[code] : `${LOCALE_NAMES[code]}. ${unavailable}`}
                                                title={translated ? LOCALE_NAMES[code] : unavailable}
                                                className="opacity-50 hover:opacity-100 dark:opacity-70 dark:hover:opacity-100 transition-opacity px-0.5 py-1"
                                            >
                                                {code}
                                            </a>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </div>

                        <div className="hidden md:block w-px h-4 bg-black/15 dark:bg-white/30" />

                        {/* Theme Toggle */}
                        <div className="opacity-60 hover:opacity-100 dark:opacity-90 dark:hover:opacity-100 transition-opacity flex items-center text-primary-text dark:text-white">
                            <ThemeToggle label={tr("nav.themeToggle")} />
                        </div>
                    </div>

                    {/* 3. Dynamic Section: Nav / Search Form (Mobile Row 2 Full Width, Desktop Middle) */}
                    <div className="col-span-2 row-start-2 flex items-center w-full md:w-auto md:flex-1 md:justify-end order-2 font-mono text-[11px] sm:text-xs uppercase tracking-widest min-h-[36px]">
                        {!isSearchActive ? (
                            <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-5 sm:gap-8 transition-opacity duration-200">
                                {/* Nav Items */}
                                <div className="flex items-center justify-between w-full md:w-auto px-4 md:px-0 gap-2 sm:gap-8">
                                    {navItems.map((item) => {
                                        const isActive = item.href === "/" ? barePath === "/" : barePath.startsWith(item.href);
                                        return (
                                            <div key={item.href} className="relative group/navitem">
                                                <a
                                                    href={localizePath(locale, item.href)}
                                                    aria-current={isActive ? "page" : undefined}
                                                    className={`transition-all duration-200 ${
                                                        isActive
                                                            ? "opacity-100 text-primary-text dark:text-white font-medium"
                                                            : "opacity-60 hover:opacity-100 dark:opacity-85 dark:hover:opacity-100 text-primary-text dark:text-zinc-300 dark:hover:text-white"
                                                    }`}
                                                >
                                                    {tr(`nav.${item.key}` as UiKey)}
                                                </a>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Search Trigger (Desktop only, as mobile is in controls) */}
                                <button
                                    onClick={() => setIsSearchActive(true)}
                                    className="hidden md:block opacity-60 hover:opacity-100 dark:opacity-90 dark:hover:opacity-100 transition-opacity cursor-pointer text-primary-text dark:text-white shrink-0"
                                    aria-label={tr("nav.searchOpen")}
                                >
                                    <RiSearchLine className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <form
                                key="search-form"
                                role="search"
                                className="flex items-center w-full px-4 md:px-0 md:max-w-[240px] h-full md:ml-auto transition-opacity duration-200"
                                onSubmit={handleSearchSubmit}
                            >
                                {/* Pure Typographic Search Input */}
                                <div className="flex-1 flex items-center w-full bg-transparent border-b border-black/20 dark:border-white/25 focus-within:border-black/60 dark:focus-within:border-white/70 transition-colors duration-300 pb-1.5">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={tr("nav.searchPlaceholder")}
                                        aria-label={tr("nav.searchPlaceholder").replace(/\.+$/, "")}
                                        className="flex-1 bg-transparent border-none outline-none text-primary-text dark:text-white caret-black dark:caret-white font-mono text-base md:text-[11px] lg:text-xs uppercase tracking-widest placeholder-secondary-text/75 dark:placeholder-white/60 focus:placeholder-transparent min-w-0"
                                        autoComplete="off"
                                        spellCheck="false"
                                    />
                                    <div className="flex items-center gap-4 shrink-0 ml-4">
                                        <button
                                            type="submit"
                                            className="opacity-50 hover:opacity-100 dark:opacity-75 dark:hover:opacity-100 transition-opacity cursor-pointer text-primary-text dark:text-white"
                                            aria-label={tr("nav.searchSubmit")}
                                        >
                                            <RiSearchLine className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsSearchActive(false)}
                                            className="hidden md:block opacity-50 hover:opacity-100 dark:opacity-75 dark:hover:opacity-100 transition-opacity cursor-pointer text-primary-text dark:text-white"
                                            aria-label={tr("nav.searchClose")}
                                        >
                                            <RiCloseLine className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </header>
        </>
    );
}
