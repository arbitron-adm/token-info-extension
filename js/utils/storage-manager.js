class StorageManager {
    static async loadSettings() {
        try {
            if (!chrome.runtime?.id) {
                throw new Error('Extension context invalidated');
            }
            const settings = await chrome.storage.sync.get({
                refreshInterval: 30,
                position: { x: 20, y: 20 },
                isMinimized: false,
                showRawData: false,
                uiScale: 100
            });
            return {
                refreshInterval: CONFIG_VALIDATOR?.validateInterval(settings.refreshInterval) ?
                    settings.refreshInterval : 30,
                position: {
                    x: Math.max(0, Math.min(window.innerWidth - 300, settings.position?.x || 20)),
                    y: Math.max(0, Math.min(window.innerHeight - 100, settings.position?.y || 20))
                },
                isMinimized: Boolean(settings.isMinimized),
                showRawData: Boolean(settings.showRawData),
                uiScale: CONFIG_VALIDATOR?.validateScale(settings.uiScale) ?
                    settings.uiScale : 100
            };
        } catch (error) {
            console.error('Error loading settings:', error);
            return {
                refreshInterval: 30,
                position: { x: 20, y: 20 },
                isMinimized: false,
                showRawData: false,
                uiScale: 100
            };
        }
    }
    static async saveSettings(settings) {
        try {
            if (!chrome.runtime?.id) {
                console.warn('Extension context invalidated, cannot save settings');
                return;
            }
            const validatedSettings = {
                refreshInterval: CONFIG_VALIDATOR?.validateInterval(settings.refreshInterval) ?
                    settings.refreshInterval : 30,
                position: {
                    x: Math.max(0, Math.min(9999, settings.position?.x || 20)),
                    y: Math.max(0, Math.min(9999, settings.position?.y || 20))
                },
                isMinimized: Boolean(settings.isMinimized),
                showRawData: Boolean(settings.showRawData),
                uiScale: CONFIG_VALIDATOR?.validateScale(settings.uiScale) ?
                    settings.uiScale : 100
            };
            await chrome.storage.sync.set(validatedSettings);
        } catch (error) {
            console.error('Error saving settings:', error);
            throw new Error('Failed to save settings');
        }
    }
    static async savePosition(position) {
        try {
            if (!chrome.runtime?.id) {
                console.warn('Extension context invalidated, cannot save position');
                return;
            }
            const validatedPosition = {
                x: Math.max(0, Math.min(9999, Number(position?.x) || 0)),
                y: Math.max(0, Math.min(9999, Number(position?.y) || 0))
            };
            await chrome.storage.sync.set({ position: validatedPosition });
        } catch (error) {
            console.error('Error saving position:', error);
        }
    }
}