let panelInstance = null;
let urlObserver = null;
let isInitialized = false;
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        if (request.action === 'reloadSettings') {
            if (panelInstance) {
                panelInstance.loadSettings();
            }
            sendResponse({ success: true });
        } else if (request.action === 'getTokenStatus') {
            const token = TokenExtractor.extractFromUrl();
            const status = {
                tokenFound: !!token,
                token: token
            };
            if (typeof API_CONFIG !== 'undefined' && API_CONFIG.debug) {
                console.log('Content script returning token status:', status);
            }
            sendResponse(status);
        }
    } catch (error) {
        console.error('Content script message handler error:', error);
        sendResponse({ success: false, error: error.message });
    }
    return true;
});
async function initPanel() {
    try {
        if (panelInstance && panelInstance.isActive) {
            const token = TokenExtractor.extractFromUrl();
            if (token) {
                panelInstance.debouncedFetchData();
            }
            return;
        }
        const existingShadowHost = document.querySelector('.arbitron-shadow-host');
        if (panelInstance && existingShadowHost && existingShadowHost.shadowRoot) {
            const token = TokenExtractor.extractFromUrl();
            if (token) {
                panelInstance.debouncedFetchData();
                return;
            }
        }
        if (panelInstance) {
            try {
                panelInstance.destroy();
            } catch (e) {
                console.warn('Error destroying old panel:', e);
            }
            panelInstance = null;
        }
        panelInstance = new ArbitronPanel();
        await panelInstance.init();
    } catch (error) {
        console.error('Error initializing panel:', error);
        ERROR_HANDLER?.log(error, 'initPanel');
    }
}
function setupGlobalUrlWatcher() {
    let currentUrl = window.location.href;
    let debounceTimer = null;
    const debouncedUpdate = PERFORMANCE_OPTIMIZER?.debounce(() => {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            if (typeof API_CONFIG !== 'undefined' && API_CONFIG.debug) {
                console.log('URL change detected:', currentUrl);
            }
            const token = TokenExtractor.extractFromUrl();
            chrome.runtime.sendMessage({
                action: 'updateTokenStatus',
                tokenFound: !!token,
                token: token
            }).catch(() => {
            });
            initPanel();
        }
    }, API_CONFIG?.timeouts?.debounceDelay || 300) || function() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                if (typeof API_CONFIG !== 'undefined' && API_CONFIG.debug) {
                    console.log('URL change detected:', currentUrl);
                }
                const token = TokenExtractor.extractFromUrl();
                chrome.runtime.sendMessage({
                    action: 'updateTokenStatus',
                    tokenFound: !!token,
                    token: token
                }).catch(() => {});
                initPanel();
            }
        }, API_CONFIG?.timeouts?.debounceDelay || 300);
    };
    const observer = new MutationObserver(PERFORMANCE_OPTIMIZER?.throttle((mutations) => {
        const hasNavChanges = mutations.some(mutation =>
            mutation.type === 'childList' &&
            (mutation.target.matches('main, [role="main"], .content, #content, body') ||
             mutation.addedNodes.length > 0)
        );
        if (hasNavChanges) {
            debouncedUpdate();
        }
    }, 100) || debouncedUpdate);
    const targetElements = document.querySelectorAll('main, [role="main"], .content, #content, body');
    const targetElement = targetElements[0] || document.body;
    if (targetElement) {
        observer.observe(targetElement, {
            childList: true,
            subtree: false
        });
        MEMORY_MANAGER?.addObserver(observer);
    }
    const intervalId = setInterval(debouncedUpdate, API_CONFIG?.timeouts?.urlCheckInterval || 1000);
    MEMORY_MANAGER?.addTimer(intervalId);
    const handlePopState = debouncedUpdate;
    const handleHashChange = debouncedUpdate;
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    MEMORY_MANAGER?.addListener(window, 'popstate', handlePopState);
    MEMORY_MANAGER?.addListener(window, 'hashchange', handleHashChange);
}
function initializeArbitron() {
    if (isInitialized) {
        return;
    }
    try {
        isInitialized = true;
        const token = TokenExtractor.extractFromUrl();
        chrome.runtime.sendMessage({
            action: 'updateTokenStatus',
            tokenFound: !!token,
            token: token
        }).catch(() => {
        });
        initPanel();
        setupGlobalUrlWatcher();
    } catch (error) {
        console.error('Error in initializeArbitron:', error);
        ERROR_HANDLER?.log(error, 'initializeArbitron');
        isInitialized = false;
    }
}
window.addEventListener('beforeunload', () => {
    try {
        MEMORY_MANAGER?.cleanup();
        if (panelInstance && typeof panelInstance.destroy === 'function') {
            panelInstance.destroy();
        }
    } catch (error) {
        console.warn('Cleanup error:', error);
    }
});
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeArbitron);
} else {
    setTimeout(initializeArbitron, 100);
}