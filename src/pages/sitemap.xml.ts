import type { APIContext } from "astro";
import { SITE_CONFIG } from "@/config";
import { buildSitemap } from "@/utils/feeds";

export async function GET({ site }: APIContext) {
    const xml = await buildSitemap(site ?? SITE_CONFIG.site);
    return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
