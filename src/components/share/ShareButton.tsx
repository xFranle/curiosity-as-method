import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RiCloseLine, RiDownload2Line, RiLinksLine, RiShareLine, RiSunLine, RiMoonLine } from "@remixicon/react";
import type { Locale } from "@/config";
import { t } from "@/i18n";
import type { UiKey } from "@/i18n";

interface ShareButtonProps {
    locale: Locale;
    title: string;
    /** Absolute canonical URL of the article. */
    url: string;
    /** Story card, light and dark (paths under the site). */
    storyImage: string;
    storyImageDark: string;
    /** File name without extension, e.g. "es-mi-articulo". */
    filename: string;
}

type CardTheme = "light" | "dark";
type Status = { kind: "info" | "error"; key: UiKey } | null;

const pill =
    "inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current";
const pillSecondary = `${pill} border-black/15 dark:border-white/20 text-primary-text dark:text-white hover:bg-black/5 dark:hover:bg-white/10`;
const pillPrimary = `${pill} border-black dark:border-white bg-black text-white dark:bg-white dark:text-black hover:opacity-85`;

/** Copy to clipboard with a fallback for browsers/contexts without the async Clipboard API. */
async function copyText(value: string): Promise<boolean> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
            return true;
        }
    } catch {
        /* fall through to the legacy path */
    }
    try {
        const area = document.createElement("textarea");
        area.value = value;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        return ok;
    } catch {
        return false;
    }
}

export default function ShareButton({ locale, title, url, storyImage, storyImageDark, filename }: ShareButtonProps) {
    const tr = useCallback((key: UiKey, vars?: Record<string, string | number>) => t(locale, key, vars), [locale]);

    const [open, setOpen] = useState(false);
    const [cardTheme, setCardTheme] = useState<CardTheme>("light");
    const [blob, setBlob] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [canShareFile, setCanShareFile] = useState(false);
    const [status, setStatus] = useState<Status>(null);

    const triggerRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);

    const openDialog = () => {
        // Start with the card that matches the theme the reader is using.
        setCardTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
        setStatus(null);
        setOpen(true);
    };

    const closeDialog = useCallback(() => {
        setOpen(false);
        triggerRef.current?.focus();
    }, []);

    // Fetch the card once per theme while the dialog is open. The same bytes feed the
    // preview, the download and the native share sheet, so nothing is downloaded twice.
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        let objectUrl: string | null = null;
        setBlob(null);
        setPreviewUrl(null);
        setLoadFailed(false);
        setCanShareFile(false);

        (async () => {
            try {
                const response = await fetch(cardTheme === "dark" ? storyImageDark : storyImage);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.blob();
                if (cancelled) return;
                objectUrl = URL.createObjectURL(data);
                setBlob(data);
                setPreviewUrl(objectUrl);

                // Can this device hand a PNG to the system share sheet?
                const file = new File([data], `${filename}.png`, { type: "image/png" });
                setCanShareFile(typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }));
            } catch (error) {
                console.error("Share card could not be loaded:", error);
                if (!cancelled) setLoadFailed(true);
            }
        })();

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [open, cardTheme, storyImage, storyImageDark, filename]);

    // Escape closes; Tab stays inside the dialog; the page behind does not scroll.
    useEffect(() => {
        if (!open) return;
        closeRef.current?.focus();
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                closeDialog();
                return;
            }
            if (event.key !== "Tab" || !dialogRef.current) return;
            const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        // Leaving the page (view transition) must not leave the dialog behind.
        const onNavigate = () => setOpen(false);

        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("astro:before-preparation", onNavigate);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("astro:before-preparation", onNavigate);
        };
    }, [open, closeDialog]);

    const handleShare = async () => {
        if (!blob) return;
        // Everything the share needs is already in memory, so navigator.share() runs
        // inside the click (browsers require a fresh user gesture).
        const file = new File([blob], `${filename}.png`, { type: "image/png" });
        try {
            await navigator.share({ files: [file], title });
            setStatus(null);
        } catch (error) {
            const name = (error as DOMException).name;
            if (name === "AbortError") setStatus({ kind: "info", key: "share.cancelled" });
            else {
                console.error("Share failed:", error);
                setStatus({ kind: "error", key: "share.error" });
            }
        }
    };

    const handleDownload = () => {
        if (!blob) return;
        const href = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = href;
        link.download = `${filename}${cardTheme === "dark" ? "-dark" : ""}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(href), 1000);
        setStatus({ kind: "info", key: "share.downloaded" });
    };

    const handleCopy = async () => {
        const ok = await copyText(url);
        setStatus(ok ? { kind: "info", key: "share.copied" } : { kind: "error", key: "share.copyError" });
    };

    const ready = Boolean(blob && previewUrl);

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={openDialog}
                aria-haspopup="dialog"
                className="inline-flex items-center gap-2 font-mono text-[11px] sm:text-xs uppercase tracking-widest text-secondary-text dark:text-zinc-300 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            >
                <RiShareLine className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{tr("share.button")}</span>
            </button>

            {open &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) closeDialog();
                        }}
                    >
                        <div
                            ref={dialogRef}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="share-dialog-title"
                            className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-[#111111]/95 text-primary-text dark:text-white shadow-2xl p-5 sm:p-8"
                        >
                            <div className="flex items-start justify-between gap-4 mb-6">
                                <div>
                                    <h2 id="share-dialog-title" className="text-lg sm:text-xl font-semibold tracking-tight">
                                        {tr("share.dialogTitle")}
                                    </h2>
                                    <p className="mt-1 text-sm text-secondary-text">{tr("share.dialogHint")}</p>
                                </div>
                                <button
                                    ref={closeRef}
                                    type="button"
                                    onClick={closeDialog}
                                    aria-label={tr("share.close")}
                                    className="shrink-0 -mr-1 -mt-1 p-2 rounded-full opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                                >
                                    <RiCloseLine className="w-5 h-5" aria-hidden="true" />
                                </button>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                                {/* Preview: the 9:16 Story card */}
                                <div className="mx-auto sm:mx-0 shrink-0 w-[min(46vw,200px)] sm:w-[220px]">
                                    <div
                                        className="relative aspect-[9/16] overflow-hidden rounded-xl border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/5"
                                        aria-busy={!ready && !loadFailed}
                                    >
                                        {previewUrl && (
                                            <img
                                                src={previewUrl}
                                                alt={tr("share.cardAlt")}
                                                width={1080}
                                                height={1920}
                                                className="absolute inset-0 h-full w-full object-cover"
                                            />
                                        )}
                                        {!ready && !loadFailed && (
                                            <div className="absolute inset-0 grid place-items-center animate-pulse font-mono text-[10px] uppercase tracking-widest text-secondary-text px-4 text-center">
                                                {tr("share.loading")}
                                            </div>
                                        )}
                                        {loadFailed && (
                                            <div className="absolute inset-0 grid place-items-center font-mono text-[10px] text-secondary-text px-4 text-center">
                                                {tr("share.imageError")}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-3 flex justify-center gap-2" role="group" aria-label={`${tr("share.themeLight")} / ${tr("share.themeDark")}`}>
                                        {(["light", "dark"] as const).map((mode) => (
                                            <button
                                                key={mode}
                                                type="button"
                                                onClick={() => setCardTheme(mode)}
                                                aria-pressed={cardTheme === mode}
                                                aria-label={mode === "light" ? tr("share.themeLight") : tr("share.themeDark")}
                                                className={`p-2 rounded-full border transition cursor-pointer ${
                                                    cardTheme === mode
                                                        ? "border-black dark:border-white opacity-100"
                                                        : "border-transparent opacity-50 hover:opacity-100"
                                                }`}
                                            >
                                                {mode === "light" ? (
                                                    <RiSunLine className="w-4 h-4" aria-hidden="true" />
                                                ) : (
                                                    <RiMoonLine className="w-4 h-4" aria-hidden="true" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex-1 min-w-0 flex flex-col gap-3">
                                    <div className="flex flex-col gap-3">
                                        {canShareFile && (
                                            <button type="button" onClick={handleShare} disabled={!ready} className={`${pillPrimary} disabled:opacity-40`}>
                                                <RiShareLine className="w-4 h-4" aria-hidden="true" />
                                                {tr("share.shareImage")}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleDownload}
                                            disabled={!ready}
                                            className={`${canShareFile ? pillSecondary : pillPrimary} disabled:opacity-40`}
                                        >
                                            <RiDownload2Line className="w-4 h-4" aria-hidden="true" />
                                            {tr("share.download")}
                                        </button>
                                        <button type="button" onClick={handleCopy} className={pillSecondary}>
                                            <RiLinksLine className="w-4 h-4" aria-hidden="true" />
                                            {tr("share.copyLink")}
                                        </button>
                                    </div>

                                    <p
                                        role="status"
                                        aria-live="polite"
                                        className={`min-h-[1.25rem] text-sm ${status?.kind === "error" ? "text-red-600 dark:text-red-400" : "text-secondary-text"}`}
                                    >
                                        {status ? tr(status.key) : ""}
                                    </p>

                                    {/* Only devices without a file share sheet (most desktops) need a hint. */}
                                    {blob && !canShareFile && (
                                        <p className="text-[13px] leading-relaxed text-secondary-text border-t border-black/10 dark:border-white/10 pt-4">
                                            {tr("share.downloadHint")}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
}
