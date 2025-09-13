class ArbitronPanel {
    constructor() {
        this.shadowHost = null;
        this.shadowRoot = null;
        this.panel = null;
        this.isMinimized = false;
        this.refreshInterval = null;
        this.lastFoundToken = null;
        this.lastUrl = '';
        this.apiClient = new ApiClient();
        this.dragHandler = null;
        this.debounceTimer = null;
        this.isTabVisible = true;
        this.pendingUpdate = false;
        this.lastPosition = { x: 0, y: 0 };
        this.currentToken = null;
        this.tokenWatcher = null;
        this.setupVisibilityListeners();
    this.userDexContract = null;
        this.dexChangeHandler = null;
        this.tokenJustChanged = false;
    }
    safeSendMessage(message) {
        try {
            if (chrome.runtime?.id) {
                chrome.runtime.sendMessage(message).catch(() => {
                });
            }
        } catch (error) {
        }
    }
    truncateContract(address) {
        if (!address || address.length <= 12) return address;
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    ensureShadowRoot() {
        const existingHost = document.querySelector('.arbitron-shadow-host');
        if (existingHost && existingHost.shadowRoot) {
            this.shadowHost = existingHost;
            this.shadowRoot = existingHost.shadowRoot;
            this.panel = this.shadowRoot.querySelector('#arbitron-panel');
            return true;
        }
        this.shadowHost = document.createElement('div');
        this.shadowHost.className = 'arbitron-shadow-host';
        this.shadowHost.style.cssText = `position: fixed; top: 0; left: 0; pointer-events: none; z-index: ${API_CONFIG.ui.zIndex};`;
        this.shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });
        document.body.appendChild(this.shadowHost);
        return false;
    }
    async init() {
        const wasExisting = this.ensureShadowRoot();
        if (wasExisting && this.panel) {
            const token = TokenExtractor.extractFromUrl();
            if (token && token !== this.lastFoundToken) {
                this.debouncedFetchData();
            }
            return;
        }
        const token = TokenExtractor.extractFromUrl();
        if (!token) {
            if (API_CONFIG.debug) console.log('No token found during init, but starting watcher');
            this.startTokenWatcher();
            this.safeSendMessage({
                action: 'updateTokenStatus',
                tokenFound: false,
                token: null
            });
            return;
        }
        await this.createPanel();
        await this.loadSettings();
        this.startDataUpdates();
        this.setupEventListeners();
        await this.syncPosition();
        this.safeSendMessage({
            action: 'updateTokenStatus',
            tokenFound: !!token,
            token: token
        });
    }
    async createPanel() {
        this.panel = await PanelUI.createPanel(this.shadowRoot);
        this.dragHandler = new DragHandler(this.shadowHost);
        PanelUI.initTabs(this.panel);
        const content = this.panel.querySelector('.arbitron-content');
        const settings = this.panel.querySelector('.arbitron-settings');
        if (content) { content.classList.remove('hide-content'); content.classList.add('show-content'); }
        if (settings) { settings.classList.remove('show-content'); settings.classList.add('hide-content'); settings.style.removeProperty('display'); }
        PanelUI.setupDonateHandlers(this.panel);
        PanelUI.updateConnectionStatus(this.panel, false);
    }
    setupEventListeners() {
        const minimizeBtn = this.panel.querySelector('.arbitron-minimize-btn');
        const settingsBtn = this.panel.querySelector('.arbitron-settings-btn');
        const saveBtn = this.panel.querySelector('.arbitron-save-btn');
        const cancelBtn = this.panel.querySelector('.arbitron-cancel-btn');
        const copyBtn = this.panel.querySelector('.raw-copy-btn');
    const dexCopyBtn = this.panel.querySelector('.raw-dex-copy-btn');
        if (minimizeBtn) minimizeBtn.addEventListener('click', () => this.toggleMinimize());
        if (settingsBtn) settingsBtn.addEventListener('click', () => this.toggleSettings());
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveSettings());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.toggleSettings());
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const ta = this.shadowRoot.querySelector('#raw-data-view');
                if (ta && ta.value) {
                    navigator.clipboard.writeText(ta.value).then(() => {
                        copyBtn.textContent = 'Copied!';
                        setTimeout(() => copyBtn.textContent = 'Copy', API_CONFIG.timeouts.copyFeedbackDuration);
                    });
                }
            });
        }
        if (dexCopyBtn) {
            dexCopyBtn.addEventListener('click', () => {
                const ta = this.shadowRoot.querySelector('#raw-dex-view');
                if (ta && ta.value) {
                    navigator.clipboard.writeText(ta.value).then(() => {
                        dexCopyBtn.textContent = 'Copied!';
                        setTimeout(() => dexCopyBtn.textContent = 'Copy', API_CONFIG.timeouts.copyFeedbackDuration);
                    });
                }
            });
        }
        const dexSelect = this.shadowRoot.querySelector('#dex-contract-select');
        if (dexSelect) dexSelect.addEventListener('change', () => this.onDexContractChanged());
    }
    setupDexSelectListener() {
        const dexSelect = this.shadowRoot.querySelector('#dex-contract-select');
        if (dexSelect) {
            dexSelect.removeEventListener('change', this.dexChangeHandler);
            this.dexChangeHandler = () => this.onDexContractChanged();
            dexSelect.addEventListener('change', this.dexChangeHandler);
        }
    }
    setupUrlChangeListener() {}
    setupVisibilityListeners() {
        document.addEventListener('visibilitychange', () => {
            this.isTabVisible = !document.hidden;
            if (this.isTabVisible && this.pendingUpdate) {
                this.pendingUpdate = false;
                this.debouncedFetchData();
            }
        });
        window.addEventListener('focus', () => {
            this.isTabVisible = true;
            if (this.pendingUpdate) {
                this.pendingUpdate = false;
                this.debouncedFetchData();
            }
            this.syncPosition();
        });
        window.addEventListener('blur', () => {
            this.isTabVisible = false;
        });
        this.setupStorageListener();
    }
    setupStorageListener() {
        if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, areaName) => {
                if (!chrome.runtime?.id) return;
                if (areaName === 'local' && changes.arbitronSettings && changes.arbitronSettings.newValue) {
                    const newSettings = changes.arbitronSettings.newValue;
                    if (newSettings.position && this.shadowHost) {
                        const newPos = newSettings.position;
                        const rect = this.shadowHost.getBoundingClientRect();
                        const currentPos = { x: rect.left, y: rect.top };
                        if (Math.abs(currentPos.x - newPos.x) > 5 || Math.abs(currentPos.y - newPos.y) > 5) {
                            this.shadowHost.style.setProperty('left', newPos.x + 'px', 'important');
                            this.shadowHost.style.setProperty('top', newPos.y + 'px', 'important');
                            this.lastPosition = { x: newPos.x, y: newPos.y };
                        }
                    }
                }
            });
        }
    }
    async syncPosition() {
        try {
            if (!chrome.runtime?.id) {
                if (API_CONFIG.debug) console.log('Extension context invalidated, skipping syncPosition');
                return;
            }
            const settings = await StorageManager.loadSettings();
            const storedPosition = settings.position;
            if (this.shadowHost) {
                const rect = this.shadowHost.getBoundingClientRect();
                const currentPos = { x: rect.left, y: rect.top };
                if (Math.abs(currentPos.x - storedPosition.x) > 5 || Math.abs(currentPos.y - storedPosition.y) > 5) {
                    this.shadowHost.style.setProperty('left', storedPosition.x + 'px', 'important');
                    this.shadowHost.style.setProperty('top', storedPosition.y + 'px', 'important');
                    this.lastPosition = { x: storedPosition.x, y: storedPosition.y };
                } else {
                    this.lastPosition = currentPos;
                }
            }
        } catch (error) {
            console.error('Error syncing position:', error);
        }
    }
    debouncedFetchData() {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        if (!this.isTabVisible) {
            this.pendingUpdate = true;
            return;
        }
        this.debounceTimer = setTimeout(() => this.fetchData(), API_CONFIG.timeouts.debounceDelay);
    }
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        const content = this.panel.querySelector('.arbitron-content');
        const settings = this.panel.querySelector('.arbitron-settings');
        const minimizeBtn = this.panel.querySelector('.arbitron-minimize-btn');
        
        if (this.isMinimized) {
            content.className = content.className.replace("show-content", "") + " hide-content";
            settings.className = settings.className.replace("show-content", "") + " hide-content";
            this.panel.classList.add('minimized');
            minimizeBtn.innerHTML = '+';
            minimizeBtn.title = 'Expand';
        } else {
            settings.className = settings.className.replace("show-content", "") + " hide-content";
            content.className = content.className.replace("hide-content", "") + " show-content";
            this.panel.classList.remove('minimized');
            minimizeBtn.innerHTML = '−';
            minimizeBtn.title = 'Minimize';
        }

        this.saveSettings({ closeSettings: false });
    }
    toggleSettings() {
    const content = this.panel.querySelector('.arbitron-content');
    const settings = this.panel.querySelector('.arbitron-settings');

    const hidden = settings.classList.contains('hide-content') ||
                    getComputedStyle(settings).display === 'none';

    if (hidden) {
        content.classList.remove('show-content'); content.classList.add('hide-content');
        settings.classList.remove('hide-content'); settings.classList.add('show-content');
        settings.style.removeProperty('display');
    } else {
        settings.classList.remove('show-content'); settings.classList.add('hide-content');
        if (!this.isMinimized) {
        content.classList.remove('hide-content'); content.classList.add('show-content');
        }
    }
    }
    async loadSettings() {
        try {
            if (!chrome.runtime?.id) {
                if (API_CONFIG.debug) console.log('Extension context invalidated, using default settings');
                return;
            }
            const settings = await StorageManager.loadSettings();
        this.isMinimized = settings.isMinimized;
    this.userDexContract = settings.userDexContract || null;
        this.lastPosition = { x: settings.position.x, y: settings.position.y };
        this.shadowHost.style.setProperty('left', settings.position.x + 'px', 'important');
        this.shadowHost.style.setProperty('top', settings.position.y + 'px', 'important');
        this.shadowHost.style.setProperty('right', 'auto', 'important');
        const scale = (settings.uiScale || API_CONFIG.ui.defaultScale) / API_CONFIG.ui.defaultScale;
        this.shadowRoot.host.style.setProperty('--scale', scale);
        const refreshInput = this.shadowRoot.querySelector('#refresh-interval');
        if (refreshInput) {
            const minSec = Math.max(API_CONFIG.ui.minRefreshSeconds, settings.refreshInterval || (API_CONFIG.timeouts.defaultRefreshInterval / 1000));
            refreshInput.value = minSec;
        }
        const scaleInput = this.shadowRoot.querySelector('#ui-scale');
        if (scaleInput) {
            scaleInput.value = settings.uiScale || API_CONFIG.ui.defaultScale;
        }
        const rawWrap = this.shadowRoot.querySelector('#raw-data-wrap');
        const rawView = this.shadowRoot.querySelector('#raw-data-view');
        if (rawWrap) rawWrap.style.setProperty('display', 'block', 'important');
        if (this.isMinimized) {
            const content = this.panel.querySelector('.arbitron-content');
            const settings_el = this.panel.querySelector('.arbitron-settings');
            const minimizeBtn = this.panel.querySelector('.arbitron-minimize-btn');
            content.className = content.className.replace("show-content", "") + " hide-content";
            settings_el.style.setProperty('display', 'none', 'important');
            this.panel.classList.add('minimized');
            minimizeBtn.innerHTML = '+';
            minimizeBtn.title = 'Expand';
        }
        const intervalMs = Math.max(API_CONFIG.timeouts.minRefreshInterval, (settings.refreshInterval || (API_CONFIG.timeouts.defaultRefreshInterval / 1000)) * 1000);
        this.setRefreshInterval(intervalMs);
        } catch (error) {
            console.error('Error loading settings:', error);
            this.isMinimized = false;
            this.userDexContract = null;
            this.setRefreshInterval(API_CONFIG.timeouts.defaultRefreshInterval);
        }
    }
    async saveSettings(opts = {}) {
        const { closeSettings = false } = opts;

        const refreshInput = this.shadowRoot.querySelector('#refresh-interval');
        const scaleInput = this.shadowRoot.querySelector('#ui-scale');
        const refreshInterval = Math.max(
            API_CONFIG.ui.minRefreshSeconds, 
            parseInt(refreshInput?.value) || API_CONFIG.ui.minRefreshSeconds
        );
        const uiScale = Math.max(
            API_CONFIG.ui.minScale, 
            Math.min(API_CONFIG.ui.maxScale, parseInt(scaleInput?.value) || API_CONFIG.ui.defaultScale)
        );

        await StorageManager.saveSettings({
            refreshInterval: refreshInterval,
            isMinimized: this.isMinimized,
            uiScale: uiScale
        });

        const scale = uiScale / API_CONFIG.ui.defaultScale;
        this.shadowRoot.host.style.setProperty('--scale', scale);

        this.setRefreshInterval(refreshInterval * 1000);

        if (closeSettings) {
            this.toggleSettings();
        }

        this.fetchData();
    }
    setRefreshInterval(interval) {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        const minInterval = Math.max(interval, API_CONFIG.timeouts.minRefreshInterval);
        this.refreshInterval = setInterval(() => {
            if (!this.isMinimized && this.isTabVisible) {
                this.debouncedFetchData();
            } else if (!this.isTabVisible) {
                this.pendingUpdate = true;
            }
        }, minInterval);
    }
    startDataUpdates() {
        this.debouncedFetchData();
        this.startTokenWatcher();
    }
    startTokenWatcher() {
        if (this.tokenWatcher) {
            this.tokenWatcher.disconnect();
        }
        this.currentToken = TokenExtractor.extractFromUrl();
        this.lastUrl = window.location.href;
        const checkUrlChange = () => {
            const newUrl = window.location.href;
            if (newUrl !== this.lastUrl) {
                this.lastUrl = newUrl;
                const newToken = TokenExtractor.extractFromUrl();
                if (newToken !== this.currentToken) {
                    this.currentToken = newToken;
                    if (newToken && !this.panel) {
                        if (API_CONFIG.debug) console.log('Token appeared, creating panel:', newToken);
                        this.init();
                        return;
                    }
                    if (!newToken && this.panel) {
                        if (API_CONFIG.debug) console.log('Token disappeared, hiding panel');
                        this.panel.style.display = 'none';
                        return;
                    }
                    if (this.isTabVisible) {
                        this.fetchData();
                    } else {
                        this.pendingUpdate = true;
                    }
                }
            }
        };
        this.urlCheckInterval = setInterval(checkUrlChange, API_CONFIG.timeouts.tokenWatchInterval);
        this.tokenWatcher = new MutationObserver(() => {
            setTimeout(checkUrlChange, API_CONFIG.timeouts.domMutationDelay);
        });
        this.tokenWatcher.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    stopTokenWatcher() {
        if (this.tokenWatcher) {
            this.tokenWatcher.disconnect();
            this.tokenWatcher = null;
        }
        if (this.urlCheckInterval) {
            clearInterval(this.urlCheckInterval);
            this.urlCheckInterval = null;
        }
    }
    async fetchData() {
        if (!chrome.runtime?.id) {
            if (API_CONFIG.debug) console.log('Extension context invalidated, skipping fetchData');
            return;
        }
        try {
            const currentUrl = window.location.href;
            const token = TokenExtractor.extractFromUrl();
            if (API_CONFIG.debug) console.log('fetchData called with token:', token);
            this.safeSendMessage({
                action: 'updateTokenStatus',
                tokenFound: !!token,
                token: token
            });
            if (!token) {
                if (API_CONFIG.debug) console.log('No token found, hiding panel');
                if (this.panel) {
                    this.panel.style.display = 'none';
                }
                return;
            }
            if (this.panel && this.panel.style.display === 'none') {
                this.panel.style.display = 'block';
            }
            const tokenChanged = (token !== this.lastFoundToken) || (currentUrl !== this.lastUrl);
            if (API_CONFIG.debug) console.log('Token changed:', tokenChanged, 'Old:', this.lastFoundToken, 'New:', token);
            if (tokenChanged) {
                const oldUserContract = this.userDexContract;
                this.userDexContract = null;
                this.tokenJustChanged = true;
                const dexSelect = this.panel?.querySelector('#dex-contract-select');
                if (dexSelect && oldUserContract) {
                    dexSelect.innerHTML = '<option value="">Loading contracts...</option>';
                }
                if (oldUserContract) {
                    StorageManager.loadSettings().then(settings => {
                        const updated = { ...settings };
                        delete updated.userDexContract;
                        return StorageManager.saveSettings(updated);
                    }).catch(() => {});
                }
                this.lastFoundToken = token;
                this.lastUrl = currentUrl;
                if (this.panel) PanelUI.showLoading(this.panel);
            }
            const isTicker = /^[A-Z]{1,10}$/i.test(token);
            this.urlContract = isTicker ? null : token;
            let data;
            if (API_CONFIG.debug) console.log('Fetching data for token:', token, 'isTicker:', isTicker);
            try {
                if (isTicker) data = await this.apiClient.searchByTicker(token);
                else data = await this.apiClient.searchByContract(token);
                if (API_CONFIG.debug) console.log('Data received:', data);
                if (this.panel) {
                    PanelUI.updateConnectionStatus(this.panel, true);
                    PanelUI.updateLastUpdate(this.panel);
                }
                if (data) {
                    await this.updateDisplay(data);
                    if (this.panel) PanelUI.showData(this.panel);
                } else if (this.panel) {
                    PanelUI.showError(this.panel, 'No token data available');
                }
            } catch (apiError) {
                if (API_CONFIG.debug) console.error('API request failed:', apiError);
                if (this.panel) {
                    PanelUI.updateConnectionStatus(this.panel, false);
                    PanelUI.showError(this.panel, 'API data fetch error');
                }
            }
        } catch (error) {
            if (API_CONFIG.debug) console.error('General data fetch error:', error);
            if (this.panel) {
                PanelUI.updateConnectionStatus(this.panel, false);
                PanelUI.showError(this.panel, 'Server connection error');
            }
        }
    }
    async updateDisplay(data) {
        if (!this.panel) {
            console.log('Panel not found in updateDisplay');
            return;
        }
    if (API_CONFIG.debug) console.log('updateDisplay called with data:', data);
        const loading = this.panel.querySelector('.arbitron-loading');
        const dataDiv = this.panel.querySelector('.arbitron-data');
        if (loading && dataDiv) {
            if (API_CONFIG.debug) console.log('Hiding loading, showing data');
            loading.style.setProperty('display', 'none', 'important');
            dataDiv.style.setProperty('display', 'block', 'important');
        } else {
            if (API_CONFIG.debug) console.log('Loading or data div not found:', { loading: !!loading, dataDiv: !!dataDiv });
        }
        const tokenInfo = this.panel.querySelector('.arbitron-token-info');
    const spotData = this.panel.querySelector('.arbitron-spot-data');
    const futuresData = this.panel.querySelector('.arbitron-futures-data');
    const networksData = this.panel.querySelector('.arbitron-networks-data');
    if (!tokenInfo || !spotData || !futuresData || !networksData) {
            if (API_CONFIG.debug) console.error('Display elements not found', {
                tokenInfo: !!tokenInfo,
                spotData: !!spotData,
                futuresData: !!futuresData,
        networksData: !!networksData
            });
            return;
        }
        const rawWrap = this.shadowRoot.querySelector('#raw-data-wrap');
        const rawView = this.shadowRoot.querySelector('#raw-data-view');
        if (rawView && rawWrap) {
            const next = JSON.stringify(data, null, 2);
            if (rawView.value !== next) rawView.value = next;
            rawWrap.style.setProperty('display', 'block', 'important');
        }
        PanelUI.updateTokenInfo(tokenInfo, data);
        let didFetchDex = false;
        if (data.success && data.data) {
            const apiData = data.data;
            if (apiData.spot) {
                PanelUI.updateCexData(spotData, apiData.spot);
            }
            if (apiData.futures) {
                PanelUI.updateFuturesData(futuresData, apiData.futures);
            }
            if (apiData.networks) {
                PanelUI.updateNetworksData(networksData, apiData.networks);
                const dexSelect = this.panel.querySelector('#dex-contract-select');
                if (dexSelect) {
                    const options = [];
                    const seen = new Set();
                    const counts = new Map();
                    const lowerToOriginal = new Map();
                    Object.entries(apiData.networks).forEach(([ex, n]) => {
                        if (n.networks) {
                            Object.entries(n.networks).forEach(([chainKey, net]) => {
                                if (net && net.contract) {
                                    if (!isNetworkAllowed(chainKey)) {
                                        return;
                                    }
                                    const ca = String(net.contract).toLowerCase();
                                    if (seen.has(ca)) {
                                        counts.set(ca, (counts.get(ca) || 0) + 1);
                                        return;
                                    }
                                    seen.add(ca);
                                    const normalizedChain = normalizeNetworkName(chainKey) || chainKey;
                                    const displayChain = getDisplayNetworkName(chainKey);
                                    const label = `${displayChain}`;
                                    options.push({ chain: normalizedChain, contract: net.contract, label });
                                    counts.set(ca, 1);
                                    lowerToOriginal.set(ca, net.contract);
                                }
                            });
                        }
                    });
                    options.sort((a, b) => {
                        const priorityA = ALLOWED_NETWORKS.indexOf(a.chain);
                        const priorityB = ALLOWED_NETWORKS.indexOf(b.chain);
                        return priorityA - priorityB;
                    });
                    const currentSelection = dexSelect.value;
                    const hadOptions = dexSelect.options.length > 0;
                    const effectiveCurrentSelection = this.tokenJustChanged ? null : currentSelection;
                    dexSelect.innerHTML = options.map(o => `<option value="${o.contract}" data-chain="${o.chain}">${o.label} | ${this.truncateContract(o.contract)}</option>`).join('');
                    if (options.length === 0) {
                        dexSelect.innerHTML = '<option value="">No contracts in allowed networks</option>';
                    }
                    this.setupDexSelectListener();
                    const preferredContract = this.userDexContract || effectiveCurrentSelection;
                    if (preferredContract) {
                        const lc = String(preferredContract).toLowerCase();
                        if (lowerToOriginal.has(lc)) {
                            dexSelect.value = lowerToOriginal.get(lc);
                        } else if ([...dexSelect.options].some(opt => opt.value.toLowerCase() === lc)) {
                            dexSelect.value = preferredContract;
                        } else if (!this.tokenJustChanged) {
                            const savedOption = document.createElement('option');
                            savedOption.value = preferredContract;
                            savedOption.textContent = `Saved | ${this.truncateContract(preferredContract)}`;
                            savedOption.setAttribute('data-chain', '');
                            dexSelect.appendChild(savedOption);
                            dexSelect.value = preferredContract;
                        }
                        if (!hadOptions || dexSelect.value !== currentSelection) {
                            await this.fetchDexData();
                            didFetchDex = true;
                        }
                    } else {
                        if (this.tokenJustChanged && this.urlContract) {
                            const lcUrl = String(this.urlContract).toLowerCase();
                            const exists = [...dexSelect.options].some(opt => opt.value.toLowerCase() === lcUrl);
                            if (!exists) {
                                const urlOpt = document.createElement('option');
                                urlOpt.value = this.urlContract;
                                urlOpt.textContent = `URL | ${this.truncateContract(this.urlContract)}`;
                                urlOpt.setAttribute('data-chain', '');
                                dexSelect.appendChild(urlOpt);
                            }
                            dexSelect.value = this.urlContract;
                            await this.fetchDexData();
                            didFetchDex = true;
                        } else {
                            let defaultContract = null;
                            let max = -1;
                            counts.forEach((cnt, ca) => { if (cnt > max) { max = cnt; defaultContract = ca; } });
                            if (defaultContract) {
                                dexSelect.value = lowerToOriginal.get(defaultContract) || defaultContract;
                                if (!hadOptions || this.tokenJustChanged) {
                                    await this.fetchDexData();
                                    didFetchDex = true;
                                }
                            }
                        }
                    }
                    this.tokenJustChanged = false;
                    if (!didFetchDex) {
                        const sel = this.shadowRoot.querySelector('#dex-contract-select');
                        if (sel && sel.value) {
                            await this.fetchDexData();
                            didFetchDex = true;
                        }
                    }
                }
            }
        } else {
            const ex = Array.isArray(data.exchanges) ? data.exchanges : [];
            const cexList = ex.filter(e => (e.type || '').toLowerCase() === 'cex');
            const dexList = ex.filter(e => (e.type || '').toLowerCase() === 'dex');
            PanelUI.updateExchanges(spotData, cexList);
            PanelUI.updateExchanges(futuresData, dexList);
            PanelUI.updateBlockchain(networksData, data.blockchain);
        }
        if (!didFetchDex) {
            const didLoadDex = await this.tryLoadDexData();
            if (!didLoadDex) {
                const sel = this.shadowRoot.querySelector('#dex-contract-select');
                if (sel && sel.value) {
                    await this.fetchDexData();
                }
            }
        }
        this.tokenJustChanged = false;
    if (API_CONFIG.debug) console.log('updateDisplay completed');
    }
    async tryLoadDexData() {
        const dexSelect = this.panel.querySelector('#dex-contract-select');
        if (dexSelect) {
            if (dexSelect.options.length > 0 && !this.tokenJustChanged) {
                return false;
            }
            if (this.tokenJustChanged) {
                dexSelect.innerHTML = '';
            }
            if (this.userDexContract) {
                dexSelect.innerHTML = `<option value="${this.userDexContract}">Saved | ${this.truncateContract(this.userDexContract)}</option>`;
                dexSelect.value = this.userDexContract;
                this.setupDexSelectListener();
                await this.fetchDexData();
                return true;
            } else {
                const currentToken = this.urlContract || TokenExtractor.extractFromUrl();
                if (currentToken && currentToken.length > 10) {
                    dexSelect.innerHTML = `<option value="${currentToken}">URL Contract | ${this.truncateContract(currentToken)}</option>`;
                    dexSelect.value = currentToken;
                    this.setupDexSelectListener();
                    await this.fetchDexData();
                    return true;
                }
            }
        }
        return false;
    }
    onDexContractChanged() {
        const dexSelect = this.shadowRoot.querySelector('#dex-contract-select');
        if (!dexSelect) return;
        const val = dexSelect.value;
        if (val) {
            this.userDexContract = val;
            const dexDiv = this.panel.querySelector('.arbitron-dex-data');
            const hasRenderedDex = dexDiv && !!dexDiv.querySelector('.dex-info-card');
            if (dexDiv && !hasRenderedDex) {
                dexDiv.innerHTML = '<div class="arbitron-loading"><span class="spinner"></span>Loading...</div>';
            }
            StorageManager.loadSettings().then(settings => {
                const updated = { ...settings, userDexContract: val };
                return StorageManager.saveSettings(updated);
            }).catch(() => {});
            this.fetchDexData();
        }
    }
    async fetchDexData() {
        if (!chrome.runtime?.id) {
            if (API_CONFIG.debug) console.log('Extension context invalidated, skipping fetchDexData');
            return;
        }
        if (this._fetchingDexData) {
            if (API_CONFIG.debug) console.log('DEX data fetch already in progress, skipping...');
            return;
        }
        try {
            this._fetchingDexData = true;
            const select = this.shadowRoot.querySelector('#dex-contract-select');
            if (!select || !select.value) return;
            const contract = select.value;
            const dexContainer = this.panel.querySelector('.arbitron-dex-data');
            if (dexContainer) {
                const hasRenderedDex = !!dexContainer.querySelector('.dex-info-card');
                if (!hasRenderedDex && !dexContainer.innerHTML.includes('<span class="spinner"></span>Loading...')) {
                    dexContainer.innerHTML = '<div class="arbitron-loading"><span class="spinner"></span>Loading...</div>';
                }
            }
            const dexData = await this.apiClient.dexSearchByContract(contract);
            if (API_CONFIG.debug) {
                console.log('DEX data received:', dexData);
                console.log('DEX data structure check:', {
                    exists: !!dexData,
                    hasSuccess: dexData && 'success' in dexData,
                    successValue: dexData?.success,
                    hasData: dexData && 'data' in dexData,
                    dataExists: !!dexData?.data
                });
            }
            if (this.panel) {
                PanelUI.updateConnectionStatus(this.panel, true);
                PanelUI.updateLastUpdate(this.panel);
            }
            const wrap = this.shadowRoot.querySelector('#raw-dex-wrap');
            const ta = this.shadowRoot.querySelector('#raw-dex-view');
            if (ta && wrap) {
                const next = JSON.stringify(dexData, null, 2);
                if (ta.value !== next) ta.value = next;
                wrap.style.setProperty('display', 'block', 'important');
            }
            const dexDiv = this.panel.querySelector('.arbitron-dex-data');
            if (dexDiv) {
                const prevScrollEl = dexDiv.querySelector('.dex-scroll-container');
                const prevScrollTop = prevScrollEl ? prevScrollEl.scrollTop : dexDiv.scrollTop;
                if (dexData && dexData.success && dexData.data) {
                    if (API_CONFIG.debug) console.log('Rendering DEX data...');
                    if (typeof DexView !== 'undefined' && DexView && typeof DexView.render === 'function') {
                        DexView.render(dexDiv, dexData);
                    } else {
                        this.renderDexInfo(dexDiv, dexData);
                    }
                } else {
                    if (API_CONFIG.debug) console.log('DEX data validation failed:', {
                        dataExists: !!dexData,
                        success: dexData?.success,
                        hasData: !!dexData?.data
                    });
                    dexDiv.innerHTML = '<div class="arbitron-item">No DEX data available</div>';
                }
                const newScrollEl = dexDiv.querySelector('.dex-scroll-container');
                if (newScrollEl) newScrollEl.scrollTop = prevScrollTop;
                else dexDiv.scrollTop = prevScrollTop;
            }
        } catch (e) {
            if (API_CONFIG.debug) console.error('Error in fetchDexData:', e);
            if (this.panel) {
                PanelUI.updateConnectionStatus(this.panel, false);
            }
            const dexDiv = this.panel.querySelector('.arbitron-dex-data');
            if (dexDiv) dexDiv.innerHTML = '<div class="arbitron-item">Error loading DEX data</div>';
        } finally {
            this._fetchingDexData = false;
        }
    }
    renderDexInfo(container, dexData) {
        try {
            const d = dexData?.data || {};
            const best = d.best_pool || {};
            const dt = d.dextools_data || {};
            const item = (dt.data && dt.data[0]) || {};
            const id = item.id || {};
            const token = item.token || {};
            const metrics = item.metrics || {};
            const score = item.dextScore || {};
            const pstats = item.periodStats || {};
            const name = item.name || '';
            const symbol = item.symbol || '';
            const quote = item.symbolRef || '';
            const price = Number(item.price || best.priceUsd || 0);
            const liq = Number(metrics.liquidity || best.liquidity?.usd || 0);
            const fdv = Number(token.metrics?.fdv || best.fdv || 0);
            const mcap = Number(token.metrics?.mcap || best.marketCap || 0);
            const priceChain = Number(item.price1h?.priceChain || 0);
            const created = item.creationTime ? new Date(item.creationTime) : null;
            const tokenCreated = item.token?.creationTime ? new Date(item.token.creationTime) : null;
            const firstSwap = item.firstSwapTimestamp ? new Date(item.firstSwapTimestamp) : null;
            let age = '—', tokenAge = '—';
            if (created) {
                const now = new Date();
                let sec = Math.max(0, (now - created) / 1000);
                const y = Math.floor(sec / (365*24*3600)); sec -= y*365*24*3600;
                const m = Math.floor(sec / (30*24*3600)); sec -= m*30*24*3600;
                const w = Math.floor(sec / (7*24*3600)); sec -= w*7*24*3600;
                const d_ = Math.floor(sec / (24*3600));
                age = [y?`${y}y`:null,m?`${m}m`:null,w?`${w}w`:null,d_?`${d_}d`:null].filter(Boolean).join(' ') || '0d';
            }
            if (tokenCreated) {
                const now = new Date();
                let sec = Math.max(0, (now - tokenCreated) / 1000);
                const y = Math.floor(sec / (365*24*3600)); sec -= y*365*24*3600;
                const m = Math.floor(sec / (30*24*3600)); sec -= m*30*24*3600;
                const w = Math.floor(sec / (7*24*3600)); sec -= w*7*24*3600;
                const d_ = Math.floor(sec / (24*3600));
                tokenAge = [y?`${y}y`:null,m?`${m}m`:null,w?`${w}w`:null,d_?`${d_}d`:null].filter(Boolean).join(' ') || '0d';
            }
            const vol24 = Number(pstats?.['24h']?.volume?.total || best.volume?.h24 || 0);
            const vol1h = Number(pstats?.['1h']?.volume?.total || best.volume?.h1 || 0);
            const vol6h = Number(pstats?.['6h']?.volume?.total || best.volume?.h6 || 0);
            const ath = Number(item.price7d?.maxPrice || 0);
            const atl = Number(item.price7d?.minPrice || 0);
            const holders = Number(token.metrics?.holders || 0);
            const circulatingSupply = Number(token.metrics?.circulatingSupply || 0);
            const maxSupply = Number(token.metrics?.maxSupply || 0);
            const txCount = Number(metrics.txCount || 0);
            const priceChange1h = Number(best.priceChange?.h1 || pstats?.['1h']?.price?.usd?.diff || 0);
            const priceChange6h = Number(best.priceChange?.h6 || pstats?.['6h']?.price?.usd?.diff || 0);
            const priceChange24h = Number(best.priceChange?.h24 || pstats?.['24h']?.price?.usd?.diff || 0);
            const txns24h = best.txns?.h24 ? (best.txns.h24.buys + best.txns.h24.sells) : (pstats?.['24h']?.swaps?.total || 0);
            const buys24h = best.txns?.h24?.buys || pstats?.['24h']?.swaps?.buys || 0;
            const sells24h = best.txns?.h24?.sells || pstats?.['24h']?.swaps?.sells || 0;
            const audit = token.audit?.dextools || {};
            const isHP = audit.is_honeypot || 'n/a';
            const isMint = audit.is_mintable || 'n/a';
            const isOS = audit.is_open_source || 'n/a';
            const isProxy = audit.is_proxy || 'n/a';
            const buyTax = audit.buy_tax?.max || 0;
            const sellTax = audit.sell_tax?.max || 0;
            const contract = id.token || d.contract || '';
            const chain = (d.chain || id.chain || best.chainId || '').toLowerCase();
            const pair = id.pair || best.pairAddress || d.pair_address || '';
            const labels = Array.isArray(best.labels) ? best.labels : [];
            const dexId = best.dexId || 'unknown';
            const version = labels.find(l => String(l).toLowerCase().startsWith('v'));
            const exchangeStr = dexId.charAt(0).toUpperCase()+dexId.slice(1) + (version? ` ${String(version).toUpperCase()}` : '');
            const socials = best.info?.socials || token.links || {};
            const websites = best.info?.websites || [];
            const twitterFollowers = token.info?.twitterStats?.followers || 0;
            const formatNumber = (num, isPrice = false) => NumberFormatter.formatNumber(num, isPrice);
            const formatChange = (change) => {
                if (change === 0) return '0%';
                const sign = change > 0 ? '+' : '';
                return `${sign}${change.toFixed(2)}%`;
            };
            const getChangeColor = (change) => {
                if (change > 0) return 'positive';
                if (change < 0) return 'negative';
                return 'neutral';
            };
            const usdLine = quote && !['USD','USDT','USDC'].includes(quote.toUpperCase())
                ? `💰 <b>USD:</b> <span class="price-value">$${formatNumber(price, true)}</span> ⋅ <b>${quote}</b> <span class="price-value">${formatNumber(priceChain, true)}</span>`
                : `💰 <b>USD:</b> <span class="price-value">$${formatNumber(price, true)}</span>`;
            const ds = `https://dexscreener.com/${chain}/${pair}`;
            const dtUrl = `https://www.dextools.io/app/${chain}/pair-explorer/${pair}`;
            const defined = `https://www.defined.fi/${chain}/${(contract||'').toLowerCase()}`;
            const gmgn = ['sol','bsc','eth','base','tron'].includes(chain) ? `https://gmgn.ai/${chain}/token/${(contract||'').toLowerCase()}` : '';
            let analyticsLinks = [];
            analyticsLinks.push(`<a href='${ds}' target='_blank' class="external-link">DexScreener</a>`);
            analyticsLinks.push(`<a href='${dtUrl}' target='_blank' class="external-link">DEXTools</a>`);
            analyticsLinks.push(`<a href='${defined}' target='_blank' class="external-link">Defined</a>`);
            if (gmgn) {
                analyticsLinks.push(`<a href='${gmgn}' target='_blank' class="external-link">GMGN</a>`);
            }
            const chainInfo = CHAIN_INFO[CHAIN_NAME_MAPPING[chain]];
            if (chainInfo && contract) {
                const contractUrl = chainInfo.contract_link.replace('{contract}', contract);
                const holdersUrl = chainInfo.holders_link.replace('{contract}', contract);
                analyticsLinks.push(`<a href='${contractUrl}' target='_blank' class="external-link">Explorer</a>`);
                analyticsLinks.push(`<a href='${holdersUrl}' target='_blank' class="external-link">Holders</a>`);
            }
            const analyticsLinksHtml = analyticsLinks.join(' ⋅ ');
            let socialLinks = [];
            if (socials.twitter || token.links?.twitter) {
                const twitterUrl = socials.twitter?.url || token.links.twitter;
                const followersText = twitterFollowers ? ` (${formatNumber(twitterFollowers)})` : '';
                socialLinks.push(`<a href='${twitterUrl}' target='_blank' class="social-link">Twitter${followersText}</a>`);
            }
            if (socials.discord || token.links?.discord) {
                const discordUrl = socials.discord?.url || token.links.discord;
                socialLinks.push(`<a href='${discordUrl}' target='_blank' class="social-link">Discord</a>`);
            }
            if (token.links?.telegram) {
                socialLinks.push(`<a href='${token.links.telegram}' target='_blank' class="social-link">Telegram</a>`);
            }
            if (token.links?.website || (websites && websites[0])) {
                const websiteUrl = token.links?.website || websites[0]?.url;
                socialLinks.push(`<a href='${websiteUrl}' target='_blank' class="social-link">Website</a>`);
            }
            const socialLinksHtml = socialLinks.length > 0 ? socialLinks.join(' ⋅ ') : '';
            const createCopyableAddress = (address, label) => {
                if (!address) return '—';
                const shortAddr = address.length > 10 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
                return `<span class="copyable-address" data-address="${address}" title="Click to copy ${label}">${shortAddr} 📋</span>`;
            };
            container.innerHTML = `
                <div class="dex-scroll-container">
                    <div class="dex-info-card">
                        <div class="token-header">
                            <div class="token-title">
                                <span class="token-name">${name || symbol}</span>
                                <span class="token-symbol">$${(symbol||'').toUpperCase()}</span>
                            </div>
                            <div class="chain-dex">
                                <span class="chain-badge">${chain.toUpperCase()}</span>
                                <span class="dex-badge">${exchangeStr}</span>
                            </div>
                        </div>
                        <div class="analytics-links-section">
                            <div class="links-title">🔗 Analytics & Tools</div>
                            <div class="analytics-links">${analyticsLinksHtml}</div>
                        </div>
                    <div class="price-section">
                        ${usdLine}
                        <div class="price-changes">
                            <span class="change-item ${getChangeColor(priceChange1h)}">1h: ${formatChange(priceChange1h)}</span>
                            <span class="change-item ${getChangeColor(priceChange6h)}">6h: ${formatChange(priceChange6h)}</span>
                            <span class="change-item ${getChangeColor(priceChange24h)}">24h: ${formatChange(priceChange24h)}</span>
                        </div>
                    </div>
                    <div class="metrics-grid">
                        <div class="metric-item">
                            <span class="metric-label">💎 FDV</span>
                            <span class="metric-value">$${formatNumber(fdv)}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">🏦 MCap</span>
                            <span class="metric-value">$${formatNumber(mcap)}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">🚀 ATH</span>
                            <span class="metric-value">$${formatNumber(ath, true)}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">📉 ATL</span>
                            <span class="metric-value">$${formatNumber(atl, true)}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">💧 Liq</span>
                            <span class="metric-value">$${formatNumber(liq)}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">👥 Holders</span>
                            <span class="metric-value">${formatNumber(holders)}</span>
                        </div>
                    </div>
                    <div class="volume-section">
                        <div class="volume-title">📈 Trading Volume</div>
                        <div class="volume-grid">
                            <div class="volume-item">
                                <span class="volume-label">1h</span>
                                <span class="volume-value">$${formatNumber(vol1h)}</span>
                            </div>
                            <div class="volume-item">
                                <span class="volume-label">6h</span>
                                <span class="volume-value">$${formatNumber(vol6h)}</span>
                            </div>
                            <div class="volume-item">
                                <span class="volume-label">24h</span>
                                <span class="volume-value">$${formatNumber(vol24)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="transactions-section">
                        <div class="tx-item">
                            <span class="tx-label">🔄 Txns 24h:</span>
                            <span class="tx-value">${formatNumber(txns24h)} (🟢${buys24h}/🔴${sells24h})</span>
                        </div>
                        <div class="tx-item">
                            <span class="tx-label">📊 Total Txs:</span>
                            <span class="tx-value">${formatNumber(txCount)}</span>
                        </div>
                    </div>
                    <div class="supply-section">
                        <div class="supply-item">
                            <span class="supply-label">💰 Circulating:</span>
                            <span class="supply-value">${formatNumber(circulatingSupply)}</span>
                        </div>
                        <div class="supply-item">
                            <span class="supply-label">🔒 Max Supply:</span>
                            <span class="supply-value">${formatNumber(maxSupply)}</span>
                        </div>
                    </div>
                    <div class="age-section">
                        <div class="age-item">
                            <span class="age-label">🎂 Token Age:</span>
                            <span class="age-value">${tokenAge}</span>
                        </div>
                        <div class="age-item">
                            <span class="age-label">🔗 Pair Age:</span>
                            <span class="age-value">${age}</span>
                        </div>
                    </div>
                    <div class="score-section">
                        <div class="score-main">
                            <span class="score-label">🏆 DexTools Score:</span>
                            <span class="score-value">${score.total ?? '—'}</span>
                        </div>
                        <div class="score-breakdown">
                            <span class="score-item">ℹ️ ${score.information ?? '—'}</span>
                            <span class="score-item">👥 ${score.holders ?? '—'}</span>
                            <span class="score-item">💧 ${score.pool ?? '—'}</span>
                            <span class="score-item">🔄 ${score.transactions ?? '—'}</span>
                            <span class="score-item">⚡ ${score.creation ?? '—'}</span>
                        </div>
                    </div>
                    <div class="safety-section">
                        <div class="safety-item">
                            <span class="safety-label">📂 Open Source:</span>
                            <span class="safety-value ${isOS==='yes'?'safe':'unsafe'}">${isOS==='yes'?'✅ Yes':'❌ No'}</span>
                        </div>
                        <div class="safety-item">
                            <span class="safety-label">🚫 Mintable:</span>
                            <span class="safety-value ${isMint==='yes'?'unsafe':'safe'}">${isMint==='yes'?'❌ Yes':'✅ No'}</span>
                        </div>
                        <div class="safety-item">
                            <span class="safety-label">🍯 Honeypot:</span>
                            <span class="safety-value ${isHP==='yes'?'unsafe':'safe'}">${isHP==='yes'?'❌ Yes':'✅ No'}</span>
                        </div>
                        <div class="safety-item">
                            <span class="safety-label">🔧 Proxy:</span>
                            <span class="safety-value ${isProxy==='yes'?'unsafe':'safe'}">${isProxy==='yes'?'❌ Yes':'✅ No'}</span>
                        </div>
                    </div>
                    <div class="tax-section">
                        <div class="tax-item">
                            <span class="tax-label">💸 Buy Tax:</span>
                            <span class="tax-value">${buyTax}%</span>
                        </div>
                        <div class="tax-item">
                            <span class="tax-label">💰 Sell Tax:</span>
                            <span class="tax-value">${sellTax}%</span>
                        </div>
                    </div>
                    <div class="addresses-section">
                        <div class="address-item">
                            <span class="address-label">📄 Contract:</span>
                            ${createCopyableAddress(contract, 'contract')}
                        </div>
                        <div class="address-item">
                            <span class="address-label">🔗 Pair:</span>
                            ${createCopyableAddress(pair, 'pool')}
                        </div>
                    </div>
                    ${socialLinksHtml ? `
                    <div class="social-links-section">
                        <div class="social-title">👥 Community</div>
                        <div class="social-links">${socialLinksHtml}</div>
                    </div>` : ''}
                </div>
            </div>`;
            setTimeout(() => {
                const copyableElements = container.querySelectorAll('.copyable-address');
                copyableElements.forEach(el => {
                    el.addEventListener('click', () => {
                        const address = el.getAttribute('data-address');
                        navigator.clipboard.writeText(address).then(() => {
                            const originalText = el.textContent;
                            el.textContent = 'Copied! ✅';
                            el.style.background = 'rgba(76, 175, 80, 0.2)';
                            setTimeout(() => {
                                el.textContent = originalText;
                                el.style.background = 'rgba(100, 181, 246, 0.1)';
                            }, API_CONFIG.timeouts.copyFeedbackDuration);
                        });
                    });
                });
            }, 100);
        } catch (error) {
            if (API_CONFIG.debug) console.error('Error in renderDexInfo:', error);
            container.innerHTML = '<div class="arbitron-item">Error displaying DEX data</div>';
        }
    }
    extractTokenFromUrl() {
        return TokenExtractor.extractFromUrl();
    }
    cleanup() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        this.stopTokenWatcher();
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }
}