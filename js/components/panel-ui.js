class PanelUI {
    static async createPanel(shadowRoot) {
        const style = document.createElement('style');
        style.textContent = await loadPanelStyles();
        shadowRoot.appendChild(style);
        const panel = document.createElement('div');
        panel.id = 'arbitron-panel';
        panel.className = 'arbitron-panel';
        panel.innerHTML = `
            <div class="arbitron-header">
                <div class="arbitron-title-section">
                    <div class="arbitron-title">ARBITRON</div>
                    <div class="arbitron-status-info">
                        <span class="connection-status" id="connection-status" title="Server connection">●</span>
                        <span class="last-update" id="last-update" title="Last update">—</span>
                    </div>
                </div>
                <div class="arbitron-controls">
                    <button class="arbitron-btn arbitron-settings-btn" title="Settings">⚙</button>
                    <button class="arbitron-btn arbitron-minimize-btn" title="Minimize">−</button>
                </div>
            </div>
            <div class="arbitron-content">
                <div class="arbitron-loading"><span class="spinner"></span>Loading...</div>
                <div class="arbitron-data" style="display: none;">
                    <div class="arbitron-tabs">
                        <button class="arbitron-tab active" data-tab="dex">DEX</button>
                        <button class="arbitron-tab" data-tab="spot">SPOT</button>
                        <button class="arbitron-tab" data-tab="futures">FUT</button>
                        <button class="arbitron-tab" data-tab="networks">NET</button>
                    </div>
                    <div class="arbitron-tab-contents">
                        <div class="tab-content" data-tab="spot" style="display:none;">
                            <div class="arbitron-token-info"></div>
                            <div class="arbitron-spot-data"></div>
                        </div>
                        <div class="tab-content" data-tab="futures" style="display:none;">
                            <div class="arbitron-futures-data"></div>
                        </div>
                        <div class="tab-content" data-tab="networks" style="display:none;">
                            <div class="arbitron-networks-data"></div>
                        </div>
                        <div class="tab-content" data-tab="dex" style="display:none;">
                            <div class="arbitron-dex-controls">
                                <select id="dex-contract-select" class="dex-contract-select"></select>
                            </div>
                            <div class="arbitron-dex-data"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="arbitron-settings hide-content">
                <div class="arbitron-setting">
                    <label>Interval (sec):</label>
                    <input type="number" id="refresh-interval" value="30" min="5">
                </div>
                <div class="arbitron-setting">
                    <label>Scale (%): </label>
                    <input type="number" id="ui-scale" value="100" min="50" max="200" step="10">
                </div>
                <div class="arbitron-setting">
                    <button class="arbitron-btn arbitron-save-btn">Save</button>
                </div>
                <div class="arbitron-setting">
                    <label>Raw data:</label>
                    <div id="raw-data-wrap" class="raw-data-wrap">
                        <textarea id="raw-data-view" class="raw-json-textarea" readonly></textarea>
                        <button type="button" class="arbitron-btn raw-copy-btn" title="Copy">Copy</button>
                    </div>
                </div>
                <div class="arbitron-setting">
                    <label>Raw DEX:</label>
                    <div id="raw-dex-wrap" class="raw-data-wrap">
                        <textarea id="raw-dex-view" class="raw-json-textarea" readonly></textarea>
                        <button type="button" class="arbitron-btn raw-dex-copy-btn" title="Copy">Copy</button>
                    </div>
                </div>
            </div>
            <div class="arbitron-donate-footer">
                <div class="donate-title">💝 Donate EVM: <span class="donate-address" data-address="0x60bffc8e6e2fd902124296f0ee045d597d8390db" title="Click to copy EVM address">0x60bf...90db</span> SOL: <span class="donate-address" data-address="DoSqpLi6xE3VmoHwhp7zht57YbgR9rVJTYKQXN54y5kE" title="Click to copy Solana address">DoSq...y5kE</span></div>
            </div>
        `;
        shadowRoot.appendChild(panel);
        return panel;
    }
    static addStyles() {
        if (!document.getElementById('arbitron-dex-view')) {
            const s = document.createElement('script');
            s.id = 'arbitron-dex-view';
            s.type = 'text/javascript';
            s.src = chrome.runtime.getURL('js/components/dex/dex-view.js');
            document.head.appendChild(s);
        }
    }
    static updateTokenInfo(container, data) {
        let spotExchangesCount = 0;
        let futuresExchangesCount = 0;
        let minPrice = null;
        let maxPrice = null;
        let spotVolume = 0;
        let futuresVolume = 0;
        let networksInfo = new Map();
        if (data.success && data.data && data.data.spot) {
            const spot = data.data.spot;
            for (const exchange in spot) {
                spotExchangesCount++;
                for (const pair in spot[exchange]) {
                    const ticker = spot[exchange][pair].ticker;
                    if (ticker) {
                        const price = ticker.last || ticker.close;
                        if (price) {
                            if (minPrice === null || price < minPrice) minPrice = price;
                            if (maxPrice === null || price > maxPrice) maxPrice = price;
                        }
                        if (ticker.quoteVolume) {
                            spotVolume += parseFloat(ticker.quoteVolume);
                        }
                    }
                }
            }
        }
        if (data.success && data.data && data.data.futures) {
            const futures = data.data.futures;
            for (const exchange in futures) {
                futuresExchangesCount++;
                for (const pair in futures[exchange]) {
                    const ticker = futures[exchange][pair].ticker;
                    if (ticker) {
                        const price = ticker.last || ticker.close;
                        if (price) {
                            if (minPrice === null || price < minPrice) minPrice = price;
                            if (maxPrice === null || price > maxPrice) maxPrice = price;
                        }
                        if (ticker.quoteVolume) {
                            futuresVolume += parseFloat(ticker.quoteVolume);
                        }
                    }
                }
            }
        }
        if (data.success && data.data && data.data.networks) {
            const networks = data.data.networks;
            for (const exchange in networks) {
                const exchangeNetworks = networks[exchange].networks;
                if (exchangeNetworks) {
                    for (const networkKey in exchangeNetworks) {
                        const network = exchangeNetworks[networkKey];
                        const networkName = networkKey;
                        const hasContract = !!network.contract;
                        const shortContract = hasContract ? this.shortenContract(network.contract) : 'N/A';
                        networksInfo.set(networkKey, {
                            name: networkName,
                            contract: shortContract,
                            fullContract: hasContract ? network.contract : null,
                            networkKey: networkKey
                        });
                    }
                }
            }
        }
    const priceRange = minPrice && maxPrice ? `$${minPrice} - $${maxPrice}` : 'N/A';
        const spotVolumeStr = spotVolume > 0 ? `$${spotVolume.toLocaleString()}` : 'N/A';
        const futuresVolumeStr = futuresVolume > 0 ? `$${futuresVolume.toLocaleString()}` : 'N/A';
        let networksChips = '';
        if (networksInfo.size > 0) {
            networksChips = Array.from(networksInfo.values()).map(net => {
                const contractPart = net.fullContract
                    ? `<span class="chip-contract" onclick="navigator.clipboard.writeText('${net.fullContract}')" title="Copy contract">${net.contract}</span>`
                    : `<span class="chip-contract no-contract">N/A</span>`;
                return `<span class="chip"><span class="chip-name">${net.name}</span>${contractPart}</span>`;
            }).join('');
        } else {
            networksChips = '<span class="chip"><span class="chip-name">N/A</span></span>';
        }
        const symbol = data.data?.token || data.symbol || 'N/A';
        container.innerHTML = `
        `;
    }
    static shortenContract(contract) {
        if (!contract) return 'N/A';
        if (contract.length <= 12) return contract;
        return contract.substring(0, 6) + '...' + contract.substring(contract.length - 6);
    }
    static updateExchanges(container, exchanges) {
        if (exchanges && exchanges.length > 0) {
            container.innerHTML = exchanges.map(exchange => `
                <div class="arbitron-exchange">
                    <a href="${exchange.url}" target="_blank" class="arbitron-link">
                        ${exchange.name} - ${exchange.type}
                    </a>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="arbitron-item">No exchange data available</div>';
        }
    }
    static updateCexData(container, cexData) {
        const prevScrollEl = container.querySelector('.cex-scroll-container');
        const prevScrollTop = prevScrollEl ? prevScrollEl.scrollTop : container.scrollTop;
        if (!cexData || Object.keys(cexData).length === 0) {
            container.innerHTML = '<div class="arbitron-item">NO CEX DATA</div>';
            if (prevScrollEl) prevScrollEl.scrollTop = prevScrollTop;
            else container.scrollTop = prevScrollTop;
            return;
        }
        let html = '<div class="cex-scroll-container"><div class="cex-info-card">';
        const exchangeCount = Object.keys(cexData).length;
        const quickLinks = Object.entries(cexData).map(([exchange, pairs]) => {
            const firstPair = Object.values(pairs)[0];
            const exchangeUrl = this.getExchangeSpotUrl(exchange, firstPair.market?.base || 'BTC');
            return `<a href="${exchangeUrl}" target="_blank" class="quick-link">${exchange.toUpperCase()}</a>`;
        }).join(', ');
        html += `
            <div class="cex-header">
                <div class="cex-title">
                    <span class="cex-name">🏛️ Centralized Exchanges</span>
                    <div class="cex-count-with-links">
                        <span class="cex-count">${exchangeCount} exchanges:</span>
                        <div class="quick-links">${quickLinks}</div>
                    </div>
                </div>
            </div>
        `;
        let allPrices = [];
        let totalVolume = 0;
        let exchangesWithData = [];
        Object.entries(cexData).forEach(([exchange, pairs]) => {
            Object.entries(pairs).forEach(([pair, data]) => {
                const ticker = data.ticker;
                const price = ticker.last ?? ticker.close;
                const volume = ticker.quoteVolume ? Number(ticker.quoteVolume) : 0;
                const change = ticker.percentage;
                if (price && !isNaN(price)) {
                    allPrices.push(Number(price));
                }
                if (volume) {
                    totalVolume += volume;
                }
                exchangesWithData.push({
                    exchange,
                    pair,
                    price: price ? Number(price) : 0,
                    change: change ? Number(change) : 0,
                    volume,
                    bid: ticker.bid ? Number(ticker.bid) : null,
                    ask: ticker.ask ? Number(ticker.ask) : null,
                    data
                });
            });
        });
        const avgPrice = allPrices.length ? (allPrices.reduce((a, b) => a + b, 0) / allPrices.length) : 0;
        const minPrice = allPrices.length ? Math.min(...allPrices) : 0;
        const maxPrice = allPrices.length ? Math.max(...allPrices) : 0;
        const priceSpread = maxPrice > 0 ? ((maxPrice - minPrice) / avgPrice * 100) : 0;
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
        html += `
            <div class="cex-summary">
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="summary-label">💰 Avg Price</span>
                        <span class="summary-value">$${formatNumber(avgPrice, true)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">📊 Total Vol</span>
                        <span class="summary-value">$${formatNumber(totalVolume)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">🔺 Max Price</span>
                        <span class="summary-value">$${formatNumber(maxPrice, true)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">🔻 Min Price</span>
                        <span class="summary-value">$${formatNumber(minPrice, true)}</span>
                    </div>
                </div>
                <div class="spread-info">
                    <span class="spread-label">📈 Price Spread:</span>
                    <span class="spread-value">${priceSpread.toFixed(2)}%</span>
                </div>
            </div>
        `;
        html += '<div class="exchanges-list">';
        const sortedExchanges = exchangesWithData.sort((a, b) => b.volume - a.volume);
        sortedExchanges.forEach(item => {
            const exchangeUrl = this.getExchangeSpotUrl(item.exchange, item.data.market?.base || 'BTC');
            html += `
                <div class="exchange-card">
                    <div class="exchange-header">
                        <div class="exchange-info">
                            <a href="${exchangeUrl}" target="_blank" class="exchange-name">${item.exchange.toUpperCase()}</a>
                            <span class="exchange-pair">${item.pair}</span>
                        </div>
                        <div class="exchange-price">
                            <span class="price-main">$${formatNumber(item.price)}</span>
                            <span class="price-change ${getChangeColor(item.change)}">${formatChange(item.change)}</span>
                        </div>
                    </div>
                    <div class="exchange-metrics">
                        <div class="metric">
                            <span class="metric-label">📈 Volume 24h</span>
                            <span class="metric-value">$${formatNumber(item.volume)}</span>
                        </div>
                        ${item.bid || item.ask ? `
                        <div class="metric">
                            <span class="metric-label">💰 Bid/Ask</span>
                            <span class="metric-value bid-ask">
                                <span class="bid">${item.bid ? '$' + formatNumber(item.bid) : 'N/A'}</span>
                                <span class="separator">/</span>
                                <span class="ask">${item.ask ? '$' + formatNumber(item.ask) : 'N/A'}</span>
                            </span>
                        </div>` : ''}
                        ${item.data.ticker.high ? `
                        <div class="metric">
                            <span class="metric-label">🔺 24h High</span>
                            <span class="metric-value">$${formatNumber(Number(item.data.ticker.high))}</span>
                        </div>` : ''}
                        ${item.data.ticker.low ? `
                        <div class="metric">
                            <span class="metric-label">🔻 24h Low</span>
                            <span class="metric-value">$${formatNumber(Number(item.data.ticker.low))}</span>
                        </div>` : ''}
                    </div>
                </div>
            `;
        });
        html += '</div></div></div>';
        container.innerHTML = html;
    const newScrollEl = container.querySelector('.cex-scroll-container');
    if (newScrollEl) newScrollEl.scrollTop = prevScrollTop;
    else container.scrollTop = prevScrollTop;
    }
    static updateFuturesData(container, futuresData) {
        const prevScrollEl = container.querySelector('.futures-scroll-container');
        const prevScrollTop = prevScrollEl ? prevScrollEl.scrollTop : container.scrollTop;
        if (!futuresData || Object.keys(futuresData).length === 0) {
            container.innerHTML = '<div class="arbitron-item">NO FUTURES DATA</div>';
            if (prevScrollEl) prevScrollEl.scrollTop = prevScrollTop;
            else container.scrollTop = prevScrollTop;
            return;
        }
        let html = '<div class="futures-scroll-container"><div class="futures-info-card">';
        const exchangeCount = Object.keys(futuresData).length;
        const quickLinks = Object.entries(futuresData).map(([exchange, pairs]) => {
            const firstPair = Object.values(pairs)[0];
            const exchangeUrl = this.getExchangeFuturesUrl(exchange, firstPair.market?.base || 'BTC');
            return `<a href="${exchangeUrl}" target="_blank" class="quick-link">${exchange.toUpperCase()}</a>`;
        }).join(', ');
        html += `
            <div class="futures-header">
                <div class="futures-title">
                    <span class="futures-name">🚀 Futures Trading</span>
                    <div class="futures-count-with-links">
                        <span class="futures-count">${exchangeCount} exchanges:</span>
                        <div class="quick-links">${quickLinks}</div>
                    </div>
                </div>
            </div>
        `;
        let allPrices = [];
        let totalVolume = 0;
        let exchangesWithData = [];
        Object.entries(futuresData).forEach(([exchange, pairs]) => {
            Object.entries(pairs).forEach(([pair, data]) => {
                const ticker = data.ticker;
                const price = ticker.last ?? ticker.close;
                const volume = ticker.quoteVolume ? Number(ticker.quoteVolume) : 0;
                const change = ticker.percentage;
                const funding = ticker.fundingRate || data.fundingRate;
                const openInterest = ticker.openInterest || data.openInterest;
                if (price && !isNaN(price)) {
                    allPrices.push(Number(price));
                }
                if (volume) {
                    totalVolume += volume;
                }
                exchangesWithData.push({
                    exchange,
                    pair,
                    price: price ? Number(price) : 0,
                    change: change ? Number(change) : 0,
                    volume,
                    funding: funding ? Number(funding) : null,
                    openInterest: openInterest ? Number(openInterest) : null,
                    bid: ticker.bid ? Number(ticker.bid) : null,
                    ask: ticker.ask ? Number(ticker.ask) : null,
                    data
                });
            });
        });
        const avgPrice = allPrices.length ? (allPrices.reduce((a, b) => a + b, 0) / allPrices.length) : 0;
        const minPrice = allPrices.length ? Math.min(...allPrices) : 0;
        const maxPrice = allPrices.length ? Math.max(...allPrices) : 0;
        const priceSpread = maxPrice > 0 ? ((maxPrice - minPrice) / avgPrice * 100) : 0;
        const fundingRates = exchangesWithData.filter(item => item.funding !== null).map(item => item.funding);
        const avgFunding = fundingRates.length ? (fundingRates.reduce((a, b) => a + b, 0) / fundingRates.length) : 0;
        const totalOI = exchangesWithData.reduce((sum, item) => sum + (item.openInterest || 0), 0);
        const formatNumber = (num, isPrice = false) => NumberFormatter.formatNumber(num, isPrice);
        const formatChange = (change) => {
            if (change === 0) return '0%';
            const sign = change > 0 ? '+' : '';
            return `${sign}${change.toFixed(2)}%`;
        };
        const formatFunding = (funding) => {
            if (funding === null) return 'N/A';
            const sign = funding > 0 ? '+' : '';
            return `${sign}${(funding * 100).toFixed(4)}%`;
        };
        const getChangeColor = (change) => {
            if (change > 0) return 'positive';
            if (change < 0) return 'negative';
            return 'neutral';
        };
        const getFundingColor = (funding) => {
            if (funding === null) return 'neutral';
            if (funding > 0.01) return 'high-positive';
            if (funding > 0) return 'positive';
            if (funding < -0.01) return 'high-negative';
            if (funding < 0) return 'negative';
            return 'neutral';
        };
        html += `
            <div class="futures-summary">
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="summary-label">💰 Avg Price</span>
                        <span class="summary-value">$${formatNumber(avgPrice, true)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">📊 Total Vol</span>
                        <span class="summary-value">$${formatNumber(totalVolume)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">🔺 Max Price</span>
                        <span class="summary-value">$${formatNumber(maxPrice, true)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">🔻 Min Price</span>
                        <span class="summary-value">$${formatNumber(minPrice, true)}</span>
                    </div>
                </div>
                <div class="futures-metrics">
                    <div class="metric-row">
                        <span class="metric-label">📈 Price Spread:</span>
                        <span class="metric-value">${priceSpread.toFixed(2)}%</span>
                    </div>
                    ${totalOI > 0 ? `
                    <div class="metric-row">
                        <span class="metric-label">🎯 Total OI:</span>
                        <span class="metric-value">$${formatNumber(totalOI)}</span>
                    </div>` : ''}
                </div>
            </div>
        `;
        html += '<div class="exchanges-list">';
        const sortedExchanges = exchangesWithData.sort((a, b) => b.volume - a.volume);
        sortedExchanges.forEach(item => {
            const exchangeUrl = this.getExchangeFuturesUrl(item.exchange, item.data.market?.base || 'BTC');
            html += `
                <div class="exchange-card">
                    <div class="exchange-header">
                        <div class="exchange-info">
                            <a href="${exchangeUrl}" target="_blank" class="exchange-name">${item.exchange.toUpperCase()}</a>
                            <span class="exchange-pair">${item.pair}</span>
                        </div>
                        <div class="exchange-price">
                            <span class="price-main">$${formatNumber(item.price)}</span>
                            <span class="price-change ${getChangeColor(item.change)}">${formatChange(item.change)}</span>
                        </div>
                    </div>
                    <div class="exchange-metrics">
                        <div class="metric">
                            <span class="metric-label">📈 Volume 24h</span>
                            <span class="metric-value">$${formatNumber(item.volume)}</span>
                        </div>
                        ${item.bid || item.ask ? `
                        <div class="metric">
                            <span class="metric-label">💰 Bid/Ask</span>
                            <span class="metric-value bid-ask">
                                <span class="bid">${item.bid ? '$' + formatNumber(item.bid) : 'N/A'}</span>
                                <span class="separator">/</span>
                                <span class="ask">${item.ask ? '$' + formatNumber(item.ask) : 'N/A'}</span>
                            </span>
                        </div>` : ''}
                        ${item.funding !== null ? `
                        <div class="metric">
                            <span class="metric-label">💸 Funding</span>
                            <span class="metric-value ${getFundingColor(item.funding)}">${formatFunding(item.funding)}</span>
                        </div>` : ''}
                        ${item.openInterest ? `
                        <div class="metric">
                            <span class="metric-label">🎯 Open Interest</span>
                            <span class="metric-value">$${formatNumber(item.openInterest)}</span>
                        </div>` : ''}
                        ${item.data.ticker.high ? `
                        <div class="metric">
                            <span class="metric-label">🔺 24h High</span>
                            <span class="metric-value">$${formatNumber(Number(item.data.ticker.high))}</span>
                        </div>` : ''}
                        ${item.data.ticker.low ? `
                        <div class="metric">
                            <span class="metric-label">🔻 24h Low</span>
                            <span class="metric-value">$${formatNumber(Number(item.data.ticker.low))}</span>
                        </div>` : ''}
                    </div>
                </div>
            `;
        });
        html += '</div></div></div>';
        container.innerHTML = html;
    const newScrollEl = container.querySelector('.futures-scroll-container');
    if (newScrollEl) newScrollEl.scrollTop = prevScrollTop;
    else container.scrollTop = prevScrollTop;
    }
    static updateNetworksData(container, networksData) {
        const prevScrollEl = container.querySelector('.networks-scroll-container');
        const prevScrollTop = prevScrollEl ? prevScrollEl.scrollTop : container.scrollTop;
        if (!networksData || Object.keys(networksData).length === 0) {
            container.innerHTML = '<div class="arbitron-item">NO NETWORKS DATA</div>';
            if (prevScrollEl) prevScrollEl.scrollTop = prevScrollTop;
            else container.scrollTop = prevScrollTop;
            return;
        }
        const exchangeNetworks = {};
        let totalNetworks = 0;
        Object.entries(networksData).forEach(([exchange, data]) => {
            if (data.networks) {
                exchangeNetworks[exchange] = [];
                Object.entries(data.networks).forEach(([networkKey, networkData]) => {
                    const networkName = networkKey;
                    const hasContract = !!networkData.contract;
                    const shortContract = hasContract ? this.shortenContract(networkData.contract) : 'N/A';
                    const status = {
                        deposit: networkData.deposit_available ?? networkData.depositAvailable ?? networkData.deposit ?? null,
                        withdraw: networkData.withdraw_available ?? networkData.withdrawAvailable ?? networkData.withdraw ?? null
                    };
                    exchangeNetworks[exchange].push({
                        networkKey: networkKey,
                        name: networkName,
                        shortContract: shortContract,
                        fullContract: hasContract ? networkData.contract : null,
                        fee: networkData.fee,
                        depositConfirm: (networkData.depositConfirm ?? networkData.deposit_confirm ?? networkData.confirmations ?? networkData.depositConfirmations ?? networkData.deposit_confirmation ?? null),
                        status
                    });
                    totalNetworks++;
                });
                if (exchangeNetworks[exchange].length === 0) {
                    delete exchangeNetworks[exchange];
                }
            }
        });
        if (Object.keys(exchangeNetworks).length === 0) {
            container.innerHTML = '<div class="arbitron-item">No active networks</div>';
            return;
        }
        let html = '<div class="networks-scroll-container"><div class="networks-info-card">';
        const exchangeCount = Object.keys(exchangeNetworks).length;
        const depositLinks = Object.entries(exchangeNetworks).map(([exchange]) => {
            const depositUrl = this.getExchangeDepositUrl(exchange);
            return `<a href="${depositUrl}" target="_blank" class="quick-link deposit">${exchange.toUpperCase()}</a>`;
        }).join(', ');
        const withdrawLinks = Object.entries(exchangeNetworks).map(([exchange]) => {
            const withdrawUrl = this.getExchangeWithdrawUrl(exchange);
            return `<a href="${withdrawUrl}" target="_blank" class="quick-link withdraw">${exchange.toUpperCase()}</a>`;
        }).join(', ');
        html += `
            <div class="networks-header">
                <div class="networks-title">
                    <span class="networks-name">🌐 Networks</span>
                    <div class="networks-count-with-links">
                        <span class="networks-count">${exchangeCount} exchanges, ${totalNetworks} networks:</span>
                        <div class="quick-links-section">
                            <div class="quick-links-group">
                                <span class="links-label">💰 Deposits:</span>
                                <div class="quick-links">${depositLinks}</div>
                            </div>
                            <div class="quick-links-group">
                                <span class="links-label">📤 Withdrawals:</span>
                                <div class="quick-links">${withdrawLinks}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        let activeDeposits = 0;
        let activeWithdrawals = 0;
        let totalFees = 0;
        let networkTypes = new Set();
        let contractNetworks = 0;
        Object.values(exchangeNetworks).forEach(networks => {
            networks.forEach(network => {
                const depVal = network.status ? network.status.deposit : null;
                const wdrVal = network.status ? network.status.withdraw : null;
                const depOn = (depVal === true || depVal === 'true' || depVal === 1 || depVal === '1');
                const wdrOn = (wdrVal === true || wdrVal === 'true' || wdrVal === 1 || wdrVal === '1');
                if (depOn) activeDeposits++;
                if (wdrOn) activeWithdrawals++;
                if (network.fee && !isNaN(parseFloat(network.fee))) {
                    totalFees += parseFloat(network.fee);
                }
                networkTypes.add(network.name);
                if (network.fullContract) contractNetworks++;
            });
        });
        const avgFee = totalFees > 0 ? totalFees / Object.values(exchangeNetworks).flat().filter(n => n.fee && !isNaN(parseFloat(n.fee))).length : 0;
        const formatNumber = (num, isPrice = false) => NumberFormatter.formatNumber(num, isPrice);
        html += `
            <div class="networks-summary">
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="summary-label">✅ Active Deposits</span>
                        <span class="summary-value">${activeDeposits}/${totalNetworks}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">💸 Active Withdrawals</span>
                        <span class="summary-value">${activeWithdrawals}/${totalNetworks}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">🔗 With Contracts</span>
                        <span class="summary-value">${contractNetworks}/${totalNetworks}</span>
                    </div>
                </div>
                <div class="network-types">
                    <span class="types-label">📡 Networks:</span>
                    <div class="network-chips">
                        ${Array.from(networkTypes).slice(0, 8).map(type =>
                            `<span class="network-chip">${type}</span>`
                        ).join('')}
                        ${networkTypes.size > 8 ? `<span class="network-chip more">+${networkTypes.size - 8} more</span>` : ''}
                    </div>
                </div>
            </div>
        `;
        html += '<div class="exchanges-list">';
        const sortedExchanges = Object.entries(exchangeNetworks).sort(([a], [b]) => a.localeCompare(b));
        sortedExchanges.forEach(([exchange, networks]) => {
            const depositUrl = this.getExchangeDepositUrl(exchange);
            const withdrawUrl = this.getExchangeWithdrawUrl(exchange);
            html += `
                <div class="exchange-card">
                    <div class="exchange-header">
                        <div class="exchange-info">
                            <span class="exchange-name">${exchange.toUpperCase()}</span>
                            <span class="networks-count">${networks.length} networks</span>
                        </div>
                        <div class="exchange-actions">
                            <a href="${depositUrl}" target="_blank" class="action-btn deposit-btn" title="Deposit">💰 Deposit</a>
                            <a href="${withdrawUrl}" target="_blank" class="action-btn withdraw-btn" title="Withdraw">📤 Withdraw</a>
                        </div>
                    </div>
                    <div class="networks-grid">
            `;
            networks.forEach(network => {
                const depVal = network.status ? network.status.deposit : null;
                const wdrVal = network.status ? network.status.withdraw : null;
                const depOn = (depVal === true || depVal === 'true' || depVal === 1 || depVal === '1');
                const depOff = (depVal === false || depVal === 'false' || depVal === 0 || depVal === '0');
                const wdrOn = (wdrVal === true || wdrVal === 'true' || wdrVal === 1 || wdrVal === '1');
                const wdrOff = (wdrVal === false || wdrVal === 'false' || wdrVal === 0 || wdrVal === '0');
                const depStatus = depOn ? 'active' : (depOff ? 'inactive' : 'unknown');
                const wdrStatus = wdrOn ? 'active' : (wdrOff ? 'inactive' : 'unknown');
                html += `
                    <div class="network-card">
                        <div class="network-header">
                            <span class="network-name">${network.name}</span>
                            <div class="status-indicators">
                                <span class="status-dot deposit ${depStatus}" title="Deposit ${depStatus}">D</span>
                                <span class="status-dot withdraw ${wdrStatus}" title="Withdraw ${wdrStatus}">W</span>
                            </div>
                        </div>
                        <div class="network-details">
                            <div class="detail-item">
                                <span class="detail-label">Fee:</span>
                                <span class="detail-value">${network.fee ? formatNumber(network.fee) : 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Confirmations:</span>
                                <span class="detail-value">${network.depositConfirm ?? 'N/A'}</span>
                            </div>
                            ${network.fullContract ? `
                            <div class="detail-item contract-item">
                                <span class="detail-label">Contract:</span>
                                <span class="copyable-contract"
                                      data-contract="${network.fullContract}"
                                      title="Click to copy: ${network.fullContract}">
                                    ${network.shortContract} 📋
                                </span>
                            </div>` : ''}
                        </div>
                    </div>
                `;
            });
            html += `
                    </div>
                </div>
            `;
        });
        html += '</div></div></div>';
        container.innerHTML = html;
    const copyableContracts = container.querySelectorAll('.copyable-contract[data-contract]');
    copyableContracts.forEach(element => {
        element.addEventListener('click', async () => {
            const contract = element.getAttribute('data-contract');
            const originalText = element.textContent;
            try {
                await navigator.clipboard.writeText(contract);
                element.textContent = element.textContent.replace('📋', '✅');
                element.className += " copyable-success";
                setTimeout(() => {
                    element.textContent = originalText;
                    element.className = element.className.replace(" copyable-success copyable-error", "");
                }, 2000);
            } catch (err) {
                console.error('Failed to copy contract:', err);
                element.textContent = element.textContent.replace('📋', '❌');
                element.className += " copyable-error";
                setTimeout(() => {
                    element.textContent = originalText;
                    element.className = element.className.replace(" copyable-success copyable-error", "");
                }, 2000);
            }
        });
    });
    const newScrollEl = container.querySelector('.networks-scroll-container');
    if (newScrollEl) newScrollEl.scrollTop = prevScrollTop;
    else container.scrollTop = prevScrollTop;
    }
    static updateBlockchain(container, blockchain) {
        if (blockchain) {
            container.innerHTML = `
                <table class="arbitron-table">
                    <tr>
                        <td class="arbitron-label">Network:</td>
                        <td class="arbitron-value">${blockchain.name}</td>
                    </tr>
                    <tr>
                        <td class="arbitron-label">Contract:</td>
                        <td class="arbitron-value">
                            <a href="${blockchain.contractUrl}" target="_blank" class="arbitron-link">
                                View
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <td class="arbitron-label">Holders:</td>
                        <td class="arbitron-value">
                            <a href="${blockchain.holdersUrl}" target="_blank" class="arbitron-link">
                                View
                            </a>
                        </td>
                    </tr>
                </table>
            `;
        } else {
            container.innerHTML = '<div class="arbitron-item">No blockchain data available</div>';
        }
    }
    static showError(panel, message) {
        const loading = panel.querySelector('.arbitron-loading');
        const dataDiv = panel.querySelector('.arbitron-data');
    if (typeof API_CONFIG !== 'undefined' && API_CONFIG.debug) console.log('showError called with message:', message);
        if (loading) {
            loading.innerHTML = `<div class="arbitron-error">${message}</div>`;
            loading.style.setProperty('display', 'block', 'important');
        }
        if (dataDiv) {
            dataDiv.style.setProperty('display', 'none', 'important');
        }
    }
    static showLoading(panel) {
        const loading = panel.querySelector('.arbitron-loading');
        const dataDiv = panel.querySelector('.arbitron-data');
    if (typeof API_CONFIG !== 'undefined' && API_CONFIG.debug) console.log('showLoading called');
        if (loading) {
            loading.innerHTML = '<span class="spinner"></span>Loading...';
            loading.style.setProperty('display', 'block', 'important');
        }
        if (dataDiv) {
            dataDiv.style.setProperty('display', 'none', 'important');
        }
    }
    static showData(panel) {
        const loading = panel.querySelector('.arbitron-loading');
        const dataDiv = panel.querySelector('.arbitron-data');
    if (typeof API_CONFIG !== 'undefined' && API_CONFIG.debug) console.log('showData called', { loading: !!loading, dataDiv: !!dataDiv });
        if (loading) {
            loading.style.setProperty('display', 'none', 'important');
        }
        if (dataDiv) {
            dataDiv.style.setProperty('display', 'block', 'important');
        }
    if (typeof API_CONFIG !== 'undefined' && API_CONFIG.debug) console.log('showData completed');
    }
    static getExchangeSpotUrl(exchange, token) {
        const exchangeKey = exchange.toLowerCase();
        const keyMapping = {
            'huobi': 'huobi',
            'htx': 'huobi',
            'gate': 'gateio',
            'gateio': 'gateio'
        };
        const mappedKey = keyMapping[exchangeKey] || exchangeKey;
        if (typeof CEX_LINKS !== 'undefined' && CEX_LINKS[mappedKey] && CEX_LINKS[mappedKey].spot) {
            return CEX_LINKS[mappedKey].spot.replace('{token.upper()}', token.toUpperCase()).replace('{token.lower()}', token.toLowerCase()).replace('{token}', token.toLowerCase());
        }
        return '#';
    }
    static getExchangeFuturesUrl(exchange, token) {
        const exchangeKey = exchange.toLowerCase();
        const keyMapping = {
            'huobi': 'huobi',
            'htx': 'huobi',
            'gate': 'gateio',
            'gateio': 'gateio'
        };
        const mappedKey = keyMapping[exchangeKey] || exchangeKey;
        if (typeof CEX_LINKS !== 'undefined' && CEX_LINKS[mappedKey] && CEX_LINKS[mappedKey].futures) {
            return CEX_LINKS[mappedKey].futures.replace('{token.upper()}', token.toUpperCase()).replace('{token.lower()}', token.toLowerCase()).replace('{token}', token.toLowerCase());
        }
        return '#';
    }
    static getExchangeDepositUrl(exchange) {
        const exchangeKey = exchange.toLowerCase();
        const keyMapping = {
            'huobi': 'huobi',
            'htx': 'huobi',
            'gate': 'gateio',
            'gateio': 'gateio'
        };
        const mappedKey = keyMapping[exchangeKey] || exchangeKey;
        if (typeof CEX_LINKS !== 'undefined' && CEX_LINKS[mappedKey] && CEX_LINKS[mappedKey].deposit) {
            return CEX_LINKS[mappedKey].deposit.replace('{token.upper()}', 'BTC').replace('{token.lower()}', 'btc').replace('{token}', 'btc');
        }
        return '#';
    }
    static getExchangeWithdrawUrl(exchange) {
        const exchangeKey = exchange.toLowerCase();
        const keyMapping = {
            'huobi': 'huobi',
            'htx': 'huobi',
            'gate': 'gateio',
            'gateio': 'gateio'
        };
        const mappedKey = keyMapping[exchangeKey] || exchangeKey;
        if (typeof CEX_LINKS !== 'undefined' && CEX_LINKS[mappedKey] && CEX_LINKS[mappedKey].withdraw) {
            return CEX_LINKS[mappedKey].withdraw.replace('{token.upper()}', 'BTC').replace('{token.lower()}', 'btc').replace('{token}', 'btc');
        }
        return '#';
    }
    static initTabs(panel) {
        const tabs = panel.querySelectorAll('.arbitron-tab');
        const contents = panel.querySelectorAll('.tab-content');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const target = tab.getAttribute('data-tab');
                contents.forEach(c => {
                    const contentTab = c.getAttribute('data-tab');
                    if (contentTab === target) {
                        c.style.setProperty('display', 'block', 'important');
                        c.style.setProperty('visibility', 'visible', 'important');
                        c.style.setProperty('opacity', '1', 'important');
                    } else {
                        c.style.setProperty('display', 'none', 'important');
                        c.style.setProperty('visibility', 'hidden', 'important');
                        c.style.setProperty('opacity', '0', 'important');
                    }
                });
            });
        });
        if (tabs.length > 0) {
            tabs.forEach(t => t.classList.remove('active'));
            let defaultTab = Array.from(tabs).find(t => t.getAttribute('data-tab') === 'dex') || tabs[0];
            defaultTab.classList.add('active');
            const def = defaultTab.getAttribute('data-tab');
            contents.forEach(c => {
                const isDef = c.getAttribute('data-tab') === def;
                c.style.setProperty('display', isDef ? 'block' : 'none', 'important');
                c.style.setProperty('visibility', isDef ? 'visible' : 'hidden', 'important');
                c.style.setProperty('opacity', isDef ? '1' : '0', 'important');
            });
        }
    }
    static updateRawData(container, data) {
        if (!container) return;
        container.innerHTML = `
            <div class="arbitron-raw">
                <h4>Raw data:</h4>
                <pre class="raw-json">${JSON.stringify(data, null, 2)}</pre>
            </div>
        `;
    }
    static updateConnectionStatus(panel, isConnected) {
        const statusEl = panel.querySelector('#connection-status');
        if (statusEl) {
            statusEl.className = `connection-status ${isConnected ? 'online' : 'offline'}`;
            statusEl.title = `Server: ${isConnected ? 'Connected' : 'Disconnected'}`;
        }
    }
    static updateLastUpdate(panel, timestamp = Date.now()) {
        const updateEl = panel.querySelector('#last-update');
        if (updateEl) {
            const now = new Date(timestamp);
            const timeStr = now.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            updateEl.textContent = timeStr;
            updateEl.title = `Last update: ${now.toLocaleString()}`;
        }
    }
    static setupDonateHandlers(panel) {
        const donateAddresses = panel.querySelectorAll('.donate-address');
        donateAddresses.forEach(addr => {
            addr.addEventListener('click', async () => {
                const fullAddress = addr.getAttribute('data-address');
                if (fullAddress) {
                    try {
                        await navigator.clipboard.writeText(fullAddress);
                        const originalText = addr.textContent;
                        addr.textContent = 'Copied!';
                        addr.style.color = 'var(--ok)';
                        setTimeout(() => {
                            addr.textContent = originalText;
                            addr.style.color = '';
                        }, 1500);
                    } catch (err) {
                        console.error('Failed to copy:', err);
                    }
                }
            });
        });
    }
}