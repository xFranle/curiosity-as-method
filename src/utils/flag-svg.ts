import type { Locale } from "@/config";

/**
 * The language flags as standalone SVG for the social cards (Satori draws images, not React).
 * Same drawing as src/components/ui/Flag.tsx: English -> USA, Spanish -> Argentina.
 * Emoji flags are not an option: they render as plain letters on Windows and Geist has none.
 */
const STRIPE = 16 / 13;

function argentina(): string {
    return (
        `<rect width="24" height="16" fill="#74ACDF"/>` +
        `<rect y="5.33" width="24" height="5.34" fill="#FFFFFF"/>` +
        `<circle cx="12" cy="8" r="1.7" fill="#F6B40E"/>`
    );
}

function unitedStates(): string {
    const stripes = [0, 2, 4, 6, 8, 10, 12]
        .map((i) => `<rect y="${i * STRIPE}" width="24" height="${STRIPE}" fill="#B22234"/>`)
        .join("");
    const stars = [0, 1, 2]
        .flatMap((row) =>
            [0, 1, 2, 3].map(
                (col) => `<circle cx="${1.5 + col * 2.2}" cy="${1.5 + row * 2.4}" r="0.55" fill="#FFFFFF"/>`,
            ),
        )
        .join("");
    return (
        `<rect width="24" height="16" fill="#FFFFFF"/>${stripes}` +
        `<rect width="9.6" height="${STRIPE * 7}" fill="#3C3B6E"/>${stars}`
    );
}

/** `data:` URI of the flag for a language, ready for an <img> in the card layout. */
export function flagDataUri(locale: Locale): string {
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16" width="24" height="16">` +
        `${locale === "es" ? argentina() : unitedStates()}</svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
