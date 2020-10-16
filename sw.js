const STATIC_CACHE_NAME = 'show-result-static-v1';
const DYNAMIC_CACHE_NAME = 'show-result-dynamic-v1';
const assets = ['index.html', 'error.html'];

// install event
self.addEventListener('install', evt => {

    console.log('SW : [INSTALLED] : service worker');
    
    evt.waitUntil(
        /*caching static assets while installing */
        caches.open(STATIC_CACHE_NAME).then(cache => {
            console.log('[CACHED]: all static assets');
            cache.addAll(assets);
        })
    );
});

// activate event
self.addEventListener('activate', evt => {

    console.log('SW : [ACTIVATED] : service worker');

    /* deleting previously cached files while updating versions */
    evt.waitUntil(
        caches.keys().then(keys => {
            //console.log(keys);
            return Promise.all(keys
                .filter(key => key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME)
                .map(key => caches.delete(key))
            );
        })
    );

});

// fetch events
self.addEventListener('fetch', evt => {

    console.log('SW : [FETCH]: ', evt.request);

    evt.respondWith(
        caches.match(evt.request,  {'ignoreSearch': true} ).then(cached_response => {

            /*if its cached already then return cache*/
            if(cached_response) return cached_response;

            /*don't need to cache csv file (cz ... it will be stored in index db for future used)*/
            if(evt.request.url.includes('.csv')){
                return fetch(evt.request);
            }

            /*else fetch and cache and return fetched_response*/
            return fetch(evt.request).then(fetched_response => {

                console.log('SW : [FETCHED response]: ', fetched_response);

                /*if status --> 404 [ i don't know why its not working in catch block]*/
                if (fetched_response.status==404) {
                    return caches.match('./error.html');
                }
                
                /*cache the response first and then return it*/
                return caches.open(DYNAMIC_CACHE_NAME).then(cache => {

                    /**caching a copy of the response*/
                    cache.put(evt.request.url, fetched_response.clone());
                    
                    return fetched_response;
                })
            })

        }).catch(e => {

            /**if user is offline*/
            return caches.match('./error.html');
            
        })
    );

});