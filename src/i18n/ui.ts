/**
 * Interface strings for every language.
 *
 * `en` defines the keys; `es` must provide every one of them (the type below
 * makes the build fail if a key is missing). Strings may contain `{name}`
 * placeholders, filled by `t(key, { name: value })`.
 *
 * Article and page *content* is not here: it lives in src/content/ (one file
 * per language).
 */
const en = {
    // Navigation
    "nav.blog": "Blog",
    "nav.about": "About",
    "nav.elsewhere": "Elsewhere",
    "nav.home": "Home",
    "nav.searchOpen": "Open search",
    "nav.searchClose": "Close search",
    "nav.searchSubmit": "Submit search",
    "nav.searchPlaceholder": "SEARCH...",
    "nav.themeToggle": "Toggle theme",
    "nav.language": "Language",
    "lang.en": "English",
    "lang.es": "Spanish",
    "nav.langUnavailable": "This page is not available in {language} yet. Go to the {language} blog.",

    // Home
    "home.readBlog": "Read the essays",
    "home.aboutMe": "About",

    // Blog index
    "blog.eyebrow": "// ESSAYS & REFLECTIONS",
    "blog.entry": "ENTRY",
    "blog.entries": "ENTRIES",
    "blog.empty": "Nothing published here yet.",
    "pagination.previous": "Previous",
    "pagination.next": "Next",
    "pagination.pageOf": "Page {current} of {total}",

    // Article
    "post.nextPost": "Next Post",
    "post.previousPost": "Previous Post",
    "post.copyright": "Copyright",
    "post.readingTime": "{minutes} min read",
    "post.availableIn": "Also available in {language}",
    "toc.label": "Table of contents",
    "toc.title": "Contents",
    "toc.top": "Top",

    // Search
    "search.title": "SEARCH",
    "search.description": "Search the {site} archive",
    "search.watermark": "Search",
    "search.querying": "Querying...",
    "search.matches": "{count} matches",
    "search.match": "{count} match",
    "search.emptyTitle": "The archive returns nothing.",
    "search.emptyBody": "No articles match your search. Try different words.",
    "search.error": "Search is not available right now. Build the site and try again.",
    "search.untitled": "Untitled",
    "search.kind.blog": "Blog",
    "search.kind.about": "About",
    "search.hint": "Type something in the search bar above.",

    // Elsewhere
    "elsewhere.eyebrow": "Network & Outposts",
    "elsewhere.heading": "Elsewhere.",
    "elsewhere.body": "Other places where I write and share things. Feel free to connect or say hello.",
    "elsewhere.count": "// {count} DESTINATIONS",
    "elsewhere.description": "Profiles and contact links.",

    // 404
    "notFound.title": "Lost in Space",
    "notFound.body": "The page you seek doesn't exist",
    "notFound.home": "Back to the start",

    // Sharing
    "share.button": "Share",
    "share.dialogTitle": "Share this essay",
    "share.dialogHint": "A card made from this article.",
    "share.close": "Close",
    "share.preview": "Preview of the Instagram Story card",
    "share.loading": "Preparing the image...",
    "share.shareImage": "Share image",
    "share.download": "Download PNG",
    "share.copyLink": "Copy link",
    "share.copied": "Link copied",
    "share.downloaded": "Image downloaded",
    "share.cancelled": "Sharing cancelled",
    "share.error": "Something went wrong. You can download the image instead.",
    "share.copyError": "Could not copy the link. Select and copy it from the address bar.",
    "share.imageError": "The image could not be loaded.",
    "share.downloadHint":
        "This browser cannot share the image directly. Download it and send it to your phone to post it as a Story, or open this page on your phone and use Share image.",
    "share.cardAlt": "Card with the title and an excerpt of the essay",
    "share.themeLight": "Light card",
    "share.themeDark": "Dark card",
    "share.filePrefix": "story",

    // Misc
    "meta.skipToContent": "Skip to content",
    "footer.rss": "RSS",
} as const;

export type UiKey = keyof typeof en;

const es: Record<UiKey, string> = {
    "nav.blog": "Blog",
    "nav.about": "Sobre mí",
    "nav.elsewhere": "En otros lugares",
    "nav.home": "Inicio",
    "nav.searchOpen": "Abrir búsqueda",
    "nav.searchClose": "Cerrar búsqueda",
    "nav.searchSubmit": "Buscar",
    "nav.searchPlaceholder": "BUSCAR...",
    "nav.themeToggle": "Cambiar tema",
    "nav.language": "Idioma",
    "lang.en": "inglés",
    "lang.es": "español",
    "nav.langUnavailable": "Esta página todavía no está disponible en {language}. Ir al blog en {language}.",

    "home.readBlog": "Leer los ensayos",
    "home.aboutMe": "Sobre mí",

    "blog.eyebrow": "// ENSAYOS Y REFLEXIONES",
    "blog.entry": "ENTRADA",
    "blog.entries": "ENTRADAS",
    "blog.empty": "Todavía no hay nada publicado acá.",
    "pagination.previous": "Anterior",
    "pagination.next": "Siguiente",
    "pagination.pageOf": "Página {current} de {total}",

    "post.nextPost": "Siguiente",
    "post.previousPost": "Anterior",
    "post.copyright": "Derechos",
    "post.readingTime": "{minutes} min de lectura",
    "post.availableIn": "También disponible en {language}",
    "toc.label": "Tabla de contenidos",
    "toc.title": "Contenido",
    "toc.top": "Subir",

    "search.title": "BUSCAR",
    "search.description": "Buscar en el archivo de {site}",
    "search.watermark": "Buscar",
    "search.querying": "Buscando...",
    "search.matches": "{count} resultados",
    "search.match": "{count} resultado",
    "search.emptyTitle": "El archivo no devuelve nada.",
    "search.emptyBody": "Ningún artículo coincide con tu búsqueda. Probá con otras palabras.",
    "search.error": "La búsqueda no está disponible ahora. Compilá el sitio e intentá de nuevo.",
    "search.untitled": "Sin título",
    "search.kind.blog": "Blog",
    "search.kind.about": "Sobre mí",
    "search.hint": "Escribí algo en la barra de búsqueda de arriba.",

    "elsewhere.eyebrow": "Red y puestos",
    "elsewhere.heading": "En otros lugares.",
    "elsewhere.body": "Otros sitios donde escribo y comparto cosas. Escribime o pasá a saludar.",
    "elsewhere.count": "// {count} DESTINOS",
    "elsewhere.description": "Perfiles y enlaces de contacto.",

    "notFound.title": "Perdido en el espacio",
    "notFound.body": "La página que buscás no existe",
    "notFound.home": "Volver al inicio",

    "share.button": "Compartir",
    "share.dialogTitle": "Compartir este ensayo",
    "share.dialogHint": "Una tarjeta hecha a partir de este artículo.",
    "share.close": "Cerrar",
    "share.preview": "Vista previa de la tarjeta para historias de Instagram",
    "share.loading": "Preparando la imagen...",
    "share.shareImage": "Compartir imagen",
    "share.download": "Descargar PNG",
    "share.copyLink": "Copiar enlace",
    "share.copied": "Enlace copiado",
    "share.downloaded": "Imagen descargada",
    "share.cancelled": "Compartir cancelado",
    "share.error": "Algo salió mal. Podés descargar la imagen en su lugar.",
    "share.copyError": "No se pudo copiar el enlace. Seleccionalo y copialo desde la barra de direcciones.",
    "share.imageError": "No se pudo cargar la imagen.",
    "share.downloadHint":
        "Este navegador no puede compartir la imagen directamente. Descargala y pasala a tu teléfono para subirla como historia, o abrí esta página en el teléfono y usá Compartir imagen.",
    "share.cardAlt": "Tarjeta con el título y un extracto del ensayo",
    "share.themeLight": "Tarjeta clara",
    "share.themeDark": "Tarjeta oscura",
    "share.filePrefix": "historia",

    "meta.skipToContent": "Saltar al contenido",
    "footer.rss": "RSS",
};

export const ui = { en, es } as const;
