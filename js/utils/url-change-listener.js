class UrlChangeListener {
    constructor(callback) {
        this.callback = callback;
        this.currentUrl = window.location.href;
        this.debounceTimer = null;
        this.init();
    }
    init() {
    const debouncedCallback = () => {
            if (this.debounceTimer) clearTimeout(this.debounceTimer);
        const delay = (typeof API_CONFIG !== 'undefined' && API_CONFIG.timeouts?.debounceDelay) ? API_CONFIG.timeouts.debounceDelay : 500;
        this.debounceTimer = setTimeout(() => {
                if (window.location.href !== this.currentUrl) {
                    this.currentUrl = window.location.href;
            if (typeof API_CONFIG !== 'undefined' && API_CONFIG.debug) console.log('URL changed:', this.currentUrl);
                    this.callback();
                }
        }, delay);
        };
    window.addEventListener('popstate', debouncedCallback);
    window.addEventListener('hashchange', debouncedCallback);
    if (this._intervalId) clearInterval(this._intervalId);
    this._intervalId = setInterval(() => {
            if (window.location.href !== this.currentUrl) {
                this.currentUrl = window.location.href;
        if (typeof API_CONFIG !== 'undefined' && API_CONFIG.debug) console.log('URL changed (polling):', this.currentUrl);
                this.callback();
            }
    }, (typeof API_CONFIG !== 'undefined' && API_CONFIG.timeouts?.urlCheckInterval) ? API_CONFIG.timeouts.urlCheckInterval : 10000);
    }
}