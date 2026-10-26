import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Picks the picture that goes on an article's social cards and prepares it for Satori.
 *
 * Order: the `cover` frontmatter field, otherwise the first Markdown image of the body.
 * Only local files under `public/` are used (nothing is fetched from the network). The
 * picture is never cropped: the cards fit it whole, so here it is only resized to at most
 * `MAX_SIDE` px on its long side and embedded as a data URI.
 */
export interface CardImage {
    /** `data:` URI that Satori can draw. */
    src: string;
    /** Pixel size of the embedded bitmap; only its proportions are used for layout. */
    width: number;
    height: number;
}

const MAX_SIDE = 1200;
const PUBLIC_DIR = path.join(process.cwd(), "public");
const IMAGE_EXT = new Set([".svg", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"]);

const cache = new Map<string, Promise<CardImage | undefined>>();

/** `/images/x.jpg` of the cover, or of the first image in the Markdown body (code blocks ignored). */
export function firstImagePath(body: string | undefined, cover?: string): string | undefined {
    if (cover?.startsWith("/images/")) return cover;
    if (!body) return undefined;
    const prose = body.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
    const match = /!\[[^\]]*\]\((\/images\/[^)\s]+)/.exec(prose);
    return match?.[1];
}

async function prepare(publicPath: string): Promise<CardImage | undefined> {
    const file = path.resolve(PUBLIC_DIR, "." + decodeURI(publicPath));
    if (!file.startsWith(PUBLIC_DIR + path.sep) || !IMAGE_EXT.has(path.extname(file).toLowerCase())) {
        console.warn(`[social-card] Image ignored (not a file under public/images): ${publicPath}`);
        return undefined;
    }
    try {
        await stat(file);
    } catch {
        console.warn(`[social-card] Image not found, the card will have no picture: ${publicPath}`);
        return undefined;
    }

    const isSvg = path.extname(file).toLowerCase() === ".svg";
    const isPhoto = [".jpg", ".jpeg"].includes(path.extname(file).toLowerCase());
    // SVGs are rasterized at high density so their text stays sharp once scaled down.
    const input = sharp(await readFile(file), isSvg ? { density: 288 } : undefined)
        .rotate() // honour EXIF orientation of photos
        .resize({
            width: MAX_SIDE,
            height: MAX_SIDE,
            fit: "inside",
            withoutEnlargement: !isSvg,
        });
    const output = isPhoto
        ? input.flatten({ background: "#ffffff" }).jpeg({ quality: 86, mozjpeg: true })
        : input.png({ compressionLevel: 9 });
    const { data, info } = await output.toBuffer({ resolveWithObject: true });
    const mime = isPhoto ? "image/jpeg" : "image/png";
    return {
        src: `data:${mime};base64,${data.toString("base64")}`,
        width: info.width,
        height: info.height,
    };
}

/** Cached per image: the same picture serves several cards and both languages. */
export function loadCardImage(body: string | undefined, cover?: string): Promise<CardImage | undefined> {
    const publicPath = firstImagePath(body, cover);
    if (!publicPath) return Promise.resolve(undefined);
    let entry = cache.get(publicPath);
    if (!entry) {
        entry = prepare(publicPath).catch((error: unknown) => {
            console.warn(`[social-card] Could not prepare ${publicPath}: ${(error as Error).message}`);
            return undefined;
        });
        cache.set(publicPath, entry);
    }
    return entry;
}
