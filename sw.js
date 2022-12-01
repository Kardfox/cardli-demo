const RESOURCES = [
    "/",
    "/favicon.ico",
    "/resources/menu-icon.png",
    "/resources/back-icon.png",
    "/resources/css/main.css",
    "/resources/html/main.html",
    "/resources/html/fallback.html",
    "/resources/js/utils/db.js",
    "/resources/js/utils/urls.js",
    "/resources/js/jquery.js",
    "/resources/js/main.js"
]

const CACHE = "cache-storage"

const addResourcesToCache = async (resources) => {
    const cache = await caches.open(CACHE)
    await cache.addAll(resources)
}

self.addEventListener("install", (event) => {
    event.waitUntil(
        addResourcesToCache(RESOURCES)
    )
})

const sendResponse = async (request) => {
    const responseFromCache = await caches.match(request);
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 6000)
        const response = await fetch(request, {
            signal: controller.signal
        })
        clearTimeout(id)

        return response
    } catch(error) {
        if (responseFromCache) return responseFromCache
        else {
            return new Response("{}", { status: 408 })
        }
    }
}

self.addEventListener("fetch", (event) => {
    event.respondWith(
        sendResponse(event.request)
    )
})