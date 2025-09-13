const PERFORMANCE_OPTIMIZER = {
    debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    },
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    cleanupOldData(map, maxAge = 300000) {
        const now = Date.now();
        for (const [key, value] of map.entries()) {
            if (value.timestamp && (now - value.timestamp) > maxAge) {
                map.delete(key);
            }
        }
    },
    batchDOMUpdates(callback) {
        requestAnimationFrame(() => {
            requestAnimationFrame(callback);
        });
    },
    lazyLoad(callback, delay = 100) {
        setTimeout(callback, delay);
    }
};
const MEMORY_MANAGER = {
    observers: new Set(),
    timers: new Set(),
    listeners: new Map(),
    addObserver(observer) {
        this.observers.add(observer);
        return observer;
    },
    addTimer(timer) {
        this.timers.add(timer);
        return timer;
    },
    addListener(element, event, handler) {
        const key = `${element.constructor.name}-${event}`;
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push({ element, handler });
        element.addEventListener(event, handler);
    },
    cleanup() {
        this.observers.forEach(observer => {
            try { observer.disconnect(); } catch (e) {}
        });
        this.observers.clear();
        this.timers.forEach(timer => {
            try { clearTimeout(timer); clearInterval(timer); } catch (e) {}
        });
        this.timers.clear();
        this.listeners.forEach(listeners => {
            listeners.forEach(({ element, handler }) => {
                try { element.removeEventListener(event, handler); } catch (e) {}
            });
        });
        this.listeners.clear();
    }
};