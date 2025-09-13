const CONFIG_VALIDATOR = {
    validateTimeout(value) {
        return typeof value === 'number' && value > 0 && value <= 60000;
    },
    validateInterval(value) {
        return typeof value === 'number' && value >= 1 && value <= 300;
    },
    validateScale(value) {
        return typeof value === 'number' && value >= 50 && value <= 200;
    },
    validateUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
};
const SANITIZER = {
    sanitizeString(str, maxLength = 100) {
        if (typeof str !== 'string') return '';
        return str.replace(/[<>&'"]/g, '').substring(0, maxLength);
    },
    sanitizeNumber(num, min = 0, max = Number.MAX_SAFE_INTEGER) {
        const n = Number(num);
        return isNaN(n) ? min : Math.min(Math.max(n, min), max);
    },
    sanitizeContract(contract) {
        if (typeof contract !== 'string') return null;
        return contract.match(/^[a-zA-Z0-9]{20,50}$/) ? contract : null;
    }
};
const ERROR_HANDLER = {
    errors: new Map(),
    maxErrors: 10,
    timeWindow: 60000,
    log(error, context = '') {
        const now = Date.now();
        const key = `${error.name || 'Error'}-${context}`;
        if (!this.errors.has(key)) {
            this.errors.set(key, []);
        }
        const errorLog = this.errors.get(key);
        errorLog.push(now);
        const cutoff = now - this.timeWindow;
        const recentErrors = errorLog.filter(time => time > cutoff);
        this.errors.set(key, recentErrors);
        if (recentErrors.length <= this.maxErrors) {
            console.error(`[${context}] ${error.message}`, error.stack);
        }
    }
};
const CSP_HELPER = {
    createSecureElement(tagName, attributes = {}) {
        const element = document.createElement(tagName);
        const safeAttributes = [
            'id', 'class', 'title', 'data-*',
            'type', 'value', 'placeholder',
            'min', 'max', 'step'
        ];
        for (const [key, value] of Object.entries(attributes)) {
            if (safeAttributes.includes(key) || key.startsWith('data-')) {
                element.setAttribute(key, SANITIZER.sanitizeString(value));
            }
        }
        return element;
    },
    setSecureHTML(element, html) {
        const cleanHTML = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+="[^"]*"/gi, '')
            .replace(/javascript:/gi, '');
        element.innerHTML = cleanHTML;
    }
};