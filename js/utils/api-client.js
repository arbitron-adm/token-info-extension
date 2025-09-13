class ApiClient {
    constructor() {
        this.baseUrl = API_ENDPOINTS?.BASE_URL || '';
        this.requestTimeout = API_CONFIG?.timeout || 10000;
    }
    async searchByTicker(ticker) {
        if (!ticker || typeof ticker !== 'string') {
            throw new Error('Invalid ticker parameter');
        }
        const sanitizedTicker = ticker.replace(/[^A-Za-z0-9]/g, '').substring(0, 20);
        if (!sanitizedTicker) {
            throw new Error('Invalid ticker format');
        }
        return this._makeSecureRequest('searchByTicker', { ticker: sanitizedTicker });
    }
    async searchByContract(contract, type = 'evm') {
        if (!contract || typeof contract !== 'string') {
            throw new Error('Invalid contract parameter');
        }
        const sanitizedContract = this._validateContract(contract);
        if (!sanitizedContract) {
            throw new Error('Invalid contract address format');
        }
        return this._makeSecureRequest('searchByContract', {
            contract: sanitizedContract,
            type: type === 'evm' ? 'evm' : 'evm'
        });
    }
    async checkHealth() {
        return this._makeSecureRequest('checkHealth');
    }
    async dexSearchByContract(contract) {
        if (!contract || typeof contract !== 'string') {
            throw new Error('Invalid contract parameter');
        }
        const sanitizedContract = this._validateContract(contract);
        if (!sanitizedContract) {
            throw new Error('Invalid contract address format');
        }
        return this._makeSecureRequest('dexSearchByContract', { contract: sanitizedContract });
    }
    _validateContract(contract) {
        if (typeof contract !== 'string') return null;
        if (contract.match(/^0x[a-fA-F0-9]{40}$/)) return contract;
        if (contract.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) return contract;
        if (contract.match(/^[a-zA-Z0-9]{20,50}$/)) return contract;
        return null;
    }
    _makeSecureRequest(action, params = {}) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Request timeout'));
            }, this.requestTimeout);
            try {
                chrome.runtime.sendMessage({
                    action,
                    ...params
                }, (response) => {
                    clearTimeout(timeout);
                    if (chrome.runtime.lastError) {
                        ERROR_HANDLER?.log(chrome.runtime.lastError, 'ApiClient') ||
                        console.error('API Error:', chrome.runtime.lastError);
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    if (!response) {
                        reject(new Error('No response received'));
                        return;
                    }
                    if (response.success) {
                        resolve(response.data);
                    } else {
                        reject(new Error(response.error || 'Unknown API error'));
                    }
                });
            } catch (error) {
                clearTimeout(timeout);
                ERROR_HANDLER?.log(error, 'ApiClient') || console.error('API Client Error:', error);
                reject(error);
            }
        });
    }
}