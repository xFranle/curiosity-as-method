// Copies the Pagefind index generated in dist/ into public/ so `pnpm dev` can search
// after a build. Cross-platform replacement for `rm -rf ... && cp -r ...`.
import { cp, rm, access } from "node:fs/promises";

try {
    await access("dist/pagefind");
    await rm("public/pagefind", { recursive: true, force: true });
    await cp("dist/pagefind", "public/pagefind", { recursive: true });
    console.log("Pagefind index copied to public/pagefind for the dev server.");
} catch {
    console.warn("dist/pagefind not found: skipping copy.");
}
