const API_CONFIG = {
    enabled: true,
    timeout: 10000,
    retries: 2,
    debug: false,
    timeouts: {
        debounceDelay: 300,
        urlCheckInterval: 1000,
        minRefreshInterval: 5000,
        defaultRefreshInterval: 5000,
        tokenWatchInterval: 500,
        domMutationDelay: 100,
        copyFeedbackDuration: 2000,
    },
    ui: {
        minRefreshSeconds: 5,
        defaultScale: 100,
        minScale: 50,
        maxScale: 200,
        zIndex: 2147483647,
    }
};