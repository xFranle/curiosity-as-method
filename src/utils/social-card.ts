/**
 * Social cards, generated at build time with Satori (layout -> SVG) and sharp (SVG -> PNG).
 *
 *   og          1200x630   link previews (Open Graph / Twitter / messaging apps)
 *   story       1080x1920  vertical card for Instagram Stories, light
 *   story-dark  1080x1920  same, dark
 *
 * Everything is deterministic and local: same text in, same pixels out. No network, no AI.
 * The look follows the theme: Geist, the same palette (src/config.ts -> socialCard),
 * mono uppercase labels and hairline borders.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import satori from "satori";
import sharp from "sharp";
import { SITE_CONFIG, type Locale } from "@/config";
import { formatDate } from "@/i18n";
import type { CardImage } from "@/utils/card-image";

export type CardKind = "og" | "story" | "story-dark";
export const CARD_KINDS: CardKind[] = ["og", "story", "story-dark"];

export const CARD_SIZES: Record<CardKind, { width: number; height: number }> = {
    og: { width: 1200, height: 630 },
    story: { width: 1080, height: 1920 },
    "story-dark": { width: 1080, height: 1920 },
};

/** Public path of a card. Mirrored by the route in src/pages/og/[...path].png.ts. */
export function cardPath(locale: Locale, slug: string, kind: CardKind = "og"): string {
    return `/og/${locale}/${slug}/${kind}.png`;
}

/** Card for pages without an article (home, lists...). */
export function defaultCardPath(locale: Locale): string {
    return `/og/${locale}/default.png`;
}

// ---------------------------------------------------------------------------
// Text preparation
// ---------------------------------------------------------------------------

/**
 * Makes text safe and predictable for drawing: no HTML/markdown markup, no emoji
 * (Geist has none and Satori would draw empty boxes), no control characters,
 * single spaces. It never rewrites words.
 */
export function cleanCardText(input: string): string {
    return input
        .normalize("NFC")
        .replace(/<[^>]*>/g, " ")
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/`/g, "")
        .replace(/\p{Extended_Pictographic}|️|‍/gu, "")
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/** Shortens at a sentence end if possible, otherwise at a word boundary, always with an ellipsis. */
export function trimExcerpt(text: string, max: number): string {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const sentenceEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
    if (sentenceEnd > max * 0.55) return cut.slice(0, sentenceEnd + 1);
    const space = cut.lastIndexOf(" ");
    const base = space > max * 0.4 ? cut.slice(0, space) : cut;
    return `${base.replace(/[\s,;:–—-]+$/, "")}…`;
}

export interface CardContent {
    locale: Locale;
    title: string;
    /** `shareExcerpt` if the author wrote one, otherwise the description. */
    excerpt: string;
    date?: Date;
    /** Picture of the article. Shown whole (never cropped), scaled down to fit. */
    image?: CardImage;
}

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------

type FontWeight = 400 | 500 | 600 | 700;
interface FontEntry {
    name: string;
    data: Buffer;
    weight: FontWeight;
    style: "normal";
}

let fontsPromise: Promise<FontEntry[]> | undefined;

/** Static Geist files from @fontsource (Satori cannot use variable fonts). Latin + Latin-ext cover English and Spanish. */
function loadFonts(): Promise<FontEntry[]> {
    fontsPromise ??= (async () => {
        const root = path.join(process.cwd(), "node_modules", "@fontsource");
        const files: { name: string; pkg: string; weights: FontWeight[] }[] = [
            { name: "Geist", pkg: "geist", weights: [400, 500, 600, 700] },
            { name: "Geist Mono", pkg: "geist-mono", weights: [400, 500] },
        ];
        const entries: FontEntry[] = [];
        for (const { name, pkg, weights } of files) {
            for (const weight of weights) {
                for (const subset of ["latin", "latin-ext"]) {
                    const file = path.join(root, pkg, "files", `${pkg}-${subset}-${weight}-normal.woff`);
                    entries.push({
                        name,
                        data: await readFile(file),
                        weight,
                        style: "normal",
                    });
                }
            }
        }
        return entries;
    })();
    return fontsPromise;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

type Style = Record<string, string | number>;
type Node = {
    type: string;
    props: {
        style?: Style;
        src?: string;
        width?: number;
        height?: number;
        children?: (Node | string)[] | Node | string;
    };
};

const h = (style: Style, ...children: (Node | string | false | undefined)[]): Node => ({
    type: "div",
    props: {
        style: { display: "flex", boxSizing: "border-box", ...style },
        children: children.filter((c): c is Node | string => Boolean(c)),
    },
});

/** Text node: Satori only clamps text that is the sole child of its element. */
const text = (style: Style, value: string): Node => ({
    type: "div",
    props: {
        style: {
            display: "flex",
            boxSizing: "border-box",
            wordBreak: "break-word",
            ...style,
        },
        children: value,
    },
});

/** The blog's mark: three dots (same as the favicon). */
const mark = (size: number, color: string): Node =>
    h(
        { alignItems: "center", gap: size * 0.45 },
        ...[0, 1, 2].map(() => h({ width: size, height: size, borderRadius: size, background: color })),
    );

/** Title size by length: long titles shrink instead of being cut. */
function titleSize(length: number, scale: { xl: number; l: number; m: number; s: number; xs: number }): number {
    if (length <= 28) return scale.xl;
    if (length <= 48) return scale.l;
    if (length <= 80) return scale.m;
    if (length <= 120) return scale.s;
    return scale.xs;
}

/**
 * The article picture, fitted whole inside a `maxWidth` x `maxHeight` box and keeping its
 * proportions (a tall photo ends up narrow, a wide diagram ends up wide). Never cropped.
 */
function imageNode(
    image: CardImage,
    maxWidth: number,
    maxHeight: number,
    radius: number,
    border: string,
    centered = false,
): Node {
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const width = Math.round(image.width * scale);
    const height = Math.round(image.height * scale);
    const frame = h(
        { width, height, flexShrink: 0, borderRadius: radius, border: `2px solid ${border}`, overflow: "hidden" },
        {
            type: "img",
            props: { src: image.src, width, height, style: { width, height, objectFit: "fill" } },
        },
    );
    return centered ? h({ justifyContent: "center", width: "100%" }, frame) : frame;
}

/** Rough count of wrapped lines, used only to decide how much room is left for the picture. */
function estimateLines(text: string, fontSize: number, width: number, clamp: number): number {
    if (!text) return 0;
    const perLine = Math.max(1, Math.floor(width / (fontSize * 0.52)));
    return Math.min(clamp, Math.ceil(text.length / perLine));
}

function palette(kind: CardKind) {
    return kind === "story-dark" ? SITE_CONFIG.socialCard.dark : SITE_CONFIG.socialCard.light;
}

/** Very soft highlight in the canvas, so it never reads as a gray blob. */
function glow(kind: CardKind): string {
    return kind === "story-dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
}

function domainOf(): string {
    return new URL(SITE_CONFIG.site).host;
}

function ogLayout(kind: CardKind, c: CardContent, title: string, excerpt: string): Node {
    const colors = palette(kind);
    const image = c.image;
    const siteName = SITE_CONFIG.title[c.locale];
    const date = SITE_CONFIG.socialCard.showDate && c.date ? formatDate(c.date, c.locale) : "";

    return h(
        {
            width: 1200,
            height: 630,
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 72px",
            background: colors.background,
            backgroundImage: `radial-gradient(circle at 85% 0%, ${glow(kind)} 0%, rgba(0,0,0,0) 55%)`,
            color: colors.text,
            fontFamily: "Geist",
        },
        // Brand row
        h(
            { alignItems: "center", gap: 20 },
            mark(10, colors.text),
            text(
                {
                    fontFamily: "Geist Mono",
                    fontSize: 24,
                    letterSpacing: 4,
                    textTransform: "uppercase",
                    color: colors.muted,
                },
                siteName,
            ),
        ),
        // Title + excerpt (+ picture on the right, when the article has one)
        h(
            { alignItems: "center", justifyContent: "space-between", gap: 56 },
            h(
                {
                    flexDirection: "column",
                    gap: 26,
                    flex: 1,
                    minWidth: 0,
                    maxHeight: image ? 380 : 500,
                    overflow: "hidden",
                },
                text(
                    {
                        fontSize: titleSize(
                            title.length,
                            image ? { xl: 72, l: 62, m: 50, s: 40, xs: 34 } : { xl: 92, l: 80, m: 66, s: 54, xs: 46 },
                        ),
                        fontWeight: 700,
                        lineHeight: 1.08,
                        letterSpacing: -2,
                        lineClamp: 3,
                    },
                    title,
                ),
                excerpt
                    ? text(
                          {
                              fontSize: image ? 26 : 30,
                              fontWeight: 400,
                              lineHeight: 1.4,
                              color: colors.muted,
                              lineClamp: image ? 3 : 2,
                          },
                          image ? trimExcerpt(excerpt, 150) : excerpt,
                      )
                    : undefined,
            ),
            image ? imageNode(image, 400, 370, 20, colors.border) : undefined,
        ),
        // Footer
        h(
            {
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: `2px solid ${colors.border}`,
                paddingTop: 28,
                fontFamily: "Geist Mono",
                fontSize: 24,
                color: colors.muted,
            },
            text({}, domainOf()),
            text({}, [SITE_CONFIG.author, date].filter(Boolean).join("  ·  ")),
        ),
    );
}

function storyLayout(kind: CardKind, c: CardContent, title: string, excerpt: string): Node {
    const colors = palette(kind);
    const siteName = SITE_CONFIG.title[c.locale];
    const date = SITE_CONFIG.socialCard.showDate && c.date ? formatDate(c.date, c.locale) : "";
    const isDark = kind === "story-dark";
    const image = c.image;

    // Room left for the picture: the 1920 px canvas minus the text and the fixed parts of the card.
    const titleFont = titleSize(title.length, {
        xl: 88,
        l: 76,
        m: 64,
        s: 54,
        xs: 46,
    });
    const textHeight =
        estimateLines(title, titleFont, 760, 6) * titleFont * 1.1 + estimateLines(excerpt, 36, 760, 7) * 36 * 1.45;
    const imageMaxHeight = Math.max(260, Math.min(600, 1640 - 480 - textHeight));

    return h(
        {
            width: 1080,
            height: 1920,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: colors.background,
            backgroundImage: `radial-gradient(circle at 50% 32%, ${glow(kind)} 0%, rgba(0,0,0,0) 62%)`,
            color: colors.text,
            fontFamily: "Geist",
        },
        // The card: a post on a quiet canvas, like a shared tweet.
        h(
            {
                width: 888,
                flexDirection: "column",
                gap: 40,
                padding: 64,
                borderRadius: 44,
                background: colors.surface,
                border: `2px solid ${colors.border}`,
                boxShadow: isDark ? "0 40px 120px rgba(0,0,0,0.6)" : "0 40px 120px rgba(0,0,0,0.10)",
            },
            // Picture of the article, whole and never cropped
            image ? imageNode(image, 760, imageMaxHeight, 28, colors.border, true) : undefined,
            // Author row
            h(
                { alignItems: "center", gap: 24 },
                h(
                    {
                        width: 88,
                        height: 88,
                        borderRadius: 88,
                        alignItems: "center",
                        justifyContent: "center",
                        border: `2px solid ${colors.border}`,
                        background: colors.background,
                    },
                    mark(9, colors.text),
                ),
                h(
                    { flexDirection: "column", gap: 4 },
                    text({ fontSize: 36, fontWeight: 600, letterSpacing: -0.5 }, SITE_CONFIG.author),
                    text({ fontFamily: "Geist Mono", fontSize: 25, color: colors.muted }, siteName),
                ),
            ),
            // Title: the protagonist
            text(
                {
                    fontSize: titleSize(title.length, {
                        xl: 88,
                        l: 76,
                        m: 64,
                        s: 54,
                        xs: 46,
                    }),
                    fontWeight: 700,
                    lineHeight: 1.1,
                    letterSpacing: -2,
                    lineClamp: 6,
                },
                title,
            ),
            // Excerpt
            excerpt
                ? text(
                      {
                          fontSize: 36,
                          fontWeight: 400,
                          lineHeight: 1.45,
                          color: colors.muted,
                          lineClamp: 7,
                      },
                      excerpt,
                  )
                : undefined,
            // Footer
            h(
                {
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTop: `2px solid ${colors.border}`,
                    paddingTop: 32,
                    fontFamily: "Geist Mono",
                    fontSize: 26,
                    color: colors.muted,
                },
                text({}, domainOf()),
                date ? text({}, date) : undefined,
            ),
        ),
    );
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/** Renders one card to PNG. Throws a descriptive error if Satori or sharp fails. */
export async function renderCard(kind: CardKind, content: CardContent): Promise<Buffer> {
    const { width, height } = CARD_SIZES[kind];
    const title = cleanCardText(content.title);
    if (!title) throw new Error("[social-card] A card needs a non-empty title.");
    const excerpt = trimExcerpt(cleanCardText(content.excerpt), SITE_CONFIG.socialCard.maxExcerptChars);

    const tree = kind === "og" ? ogLayout(kind, content, title, excerpt) : storyLayout(kind, content, title, excerpt);

    try {
        const svg = await satori(tree as unknown as Parameters<typeof satori>[0], {
            width,
            height,
            fonts: await loadFonts(),
        });
        return await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    } catch (error) {
        throw new Error(`[social-card] Could not render "${content.title}" (${kind}): ${(error as Error).message}`);
    }
}
