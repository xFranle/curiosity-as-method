import type { APIContext } from "astro";
import { buildRss } from "@/utils/feeds";

export const GET = (context: APIContext) => buildRss("es", context);
