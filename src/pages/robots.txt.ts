import type { APIRoute } from "astro";
import { SITE_CONFIG } from "@/config";

export const GET: APIRoute = ({ site }) => {
    const origin = (site ?? new URL(SITE_CONFIG.site)).origin;
    const body = `User-agent: *
Allow: /

Sitemap: ${origin}/sitemap.xml
# LLM context: ${origin}/llms.txt
`;
    return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
