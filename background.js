let tabTokenStatus = new Map();
try {
    importScripts('js/config/endpoints.js');
    importScripts('js/utils/api-utils.js');
} catch (error) {
    console.error('Failed to import scripts:', error);
}
function validateTicker(ticker) {
    if (!ticker || typeof ticker !== 'string') return null;
    const cleaned = ticker.replace(/[^A-Za-z0-9]/g, '').substring(0, 20);
    return cleaned.length >= 1 ? cleaned : null;
}
function validateContract(contract) {
    if (!contract || typeof contract !== 'string') return null;
    if (contract.match(/^0x[a-fA-F0-9]{40}$/)) return contract;
    if (contract.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) return contract;
    if (contract.match(/^[a-zA-Z0-9]{20,50}$/)) return contract;
    return null;
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const tabId = sender?.tab?.id || 0;
    try {
        if (request.action === 'settingsUpdated') {
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'reloadSettings'
                    }).catch(() => {
                    });
                });
            });
            sendResponse({ success: true });
        } else if (request.action === 'updateTokenStatus') {
            if (sender && sender.tab) {
                const tokenData = {
                    tokenFound: Boolean(request.tokenFound),
                    token: request.token ? validateTicker(request.token) : null
                };
                tabTokenStatus.set(sender.tab.id, tokenData);
            }
            sendResponse({ success: true });
        } else if (request.action === 'getTokenStatus') {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length > 0) {
                    const activeTabStatus = tabTokenStatus.get(tabs[0].id) || {
                        tokenFound: false,
                        token: null
                    };
                    sendResponse(activeTabStatus);
                } else {
                    sendResponse({ tokenFound: false, token: null });
                }
            });
            return true;
        } else if (request.action === 'searchByTicker') {
            const ticker = validateTicker(request.ticker);
            if (!ticker) {
                sendResponse({ success: false, error: 'Invalid ticker format' });
                return true;
            }
            if (typeof searchByTicker === 'function') {
                searchByTicker(ticker)
                    .then(data => sendResponse({ success: true, data }))
                    .catch(error => sendResponse({ success: false, error: error.message }));
            } else {
                sendResponse({ success: false, error: 'Search function not available' });
            }
            return true;
        } else if (request.action === 'searchByContract') {
            const contract = validateContract(request.contract);
            if (!contract) {
                sendResponse({ success: false, error: 'Invalid contract format' });
                return true;
            }
            if (typeof searchByContract === 'function') {
                searchByContract(contract)
                    .then(data => sendResponse({ success: true, data }))
                    .catch(error => sendResponse({ success: false, error: error.message }));
            } else {
                sendResponse({ success: false, error: 'Search function not available' });
            }
            return true;
        } else if (request.action === 'dexSearchByContract') {
            const contract = validateContract(request.contract);
            if (!contract) {
                sendResponse({ success: false, error: 'Invalid contract format' });
                return true;
            }
            if (typeof dexSearchByContract === 'function') {
                dexSearchByContract(contract)
                    .then(data => sendResponse({ success: true, data }))
                    .catch(error => sendResponse({ success: false, error: error.message }));
            } else {
                sendResponse({ success: false, error: 'DEX search function not available' });
            }
            return true;
        } else if (request.action === 'checkHealth') {
            if (typeof checkHealth === 'function') {
                checkHealth()
                    .then(data => sendResponse({ success: true, data }))
                    .catch(error => sendResponse({ success: false, error: error.message }));
            } else {
                sendResponse({ success: false, error: 'Health check function not available' });
            }
            return true;
        }
    } catch (error) {
        console.error('Background script error:', error);
        sendResponse({ success: false, error: 'Internal error' });
    }
    return true;
});
setInterval(() => {
    const now = Date.now();
    const cutoff = now - 300000;
    for (const [key, times] of backgroundRateLimit.entries()) {
        const recentTimes = times.filter(time => time > cutoff);
        if (recentTimes.length === 0) {
            backgroundRateLimit.delete(key);
        } else {
            backgroundRateLimit.set(key, recentTimes);
        }
    }
}, 300000);
chrome.tabs.onRemoved.addListener((tabId) => {
    tabTokenStatus.delete(tabId);
    const keysToDelete = [];
    for (const key of backgroundRateLimit.keys()) {
        if (key.endsWith(`-${tabId}`)) {
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach(key => backgroundRateLimit.delete(key));
});
chrome.runtime.onInstalled.addListener(() => {
    console.log('Arbitron Panel Extension installed');
});