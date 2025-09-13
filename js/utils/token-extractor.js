class TokenExtractor {
    static extractFromUrl(url = window.location.href, hostname = window.location.hostname) {
        if (API_CONFIG.debug)  console.log('Searching token in URL:', url);
        const pageBase = this.getBaseDomain(hostname);
        let foundOnKnownExchange = false;
        for (const exchange in CEX_LINKS) {
            const exchangeLinks = CEX_LINKS[exchange];
            for (const linkType in exchangeLinks) {
                const linkTemplate = exchangeLinks[linkType];
                const exchangeDomain = this.extractDomainFromTemplate(linkTemplate);
                const exchangeBase = this.getBaseDomain(exchangeDomain);
                if (pageBase && exchangeBase && pageBase === exchangeBase) {
                    foundOnKnownExchange = true;
                    break;
                }
            }
            if (foundOnKnownExchange) {
                const token = this.extractFromExchange(url, exchange);
                if (token) return token;
                break;
            }
        }
        return this.extractFromSpecialSites(url, hostname) ||
               this.extractFromExplorers(url, hostname) ||
               this.extractTickerFromCEX(url, hostname) ||
               this.extractGenericToken(url);
    }
    static extractFromExchange(url, exchange) {
        const patterns = [
            /[\/?#&]symbol=([A-Z]{2,15})(?:[-_]?USDTM?(?:_PERP|PERP)?)\b/i,
            /\/(?:trade|spot|futures|perpetual|exchange)\/(?:[A-Za-z-]+\/)?([A-Z]{2,15})[-_]?USDTM?(?:_PERP|PERP)?\b/i,
            /\/trade\/([A-Z]{2,15})_USDT(?:_PERP)?\b/i,
            /\/futures\/trade\/([A-Z]{2,15})_USDT_PERP\b/i,
            /\/trade\/spot\/([A-Z]{2,15})\/USDT\b/i,
            /[?#]contract_code=([A-Z]{2,15})[-_]?USDTM?(?:_PERP|PERP)?\b/i,
            /\/([A-Z]{2,15})[-_]?USDTM?(?:_PERP|PERP)?\b/i,
            /\b([A-Z]{2,15})[-_]?USDTM?(?:_PERP|PERP)?\b/i
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                const token = match[1].toUpperCase();
                if (!['USDT','USDC','EN','RU','USD','EUR'].includes(token)) {
                    if (API_CONFIG.debug)  console.log(`${exchange} exchange token found:`, token);
                    return token;
                }
            }
        }
        const fallbackPatterns = [
            /[\/?#&]symbol=([A-Z]{2,15})(?:[-_]?USDTM?(?:_PERP|PERP)?)\b/i,
            /\b([A-Z]{2,15})[-_]?USDTM?(?:_PERP|PERP)?\b/i,
            /\b([A-Z]{2,15})USDTM?\b/i
        ];
        for (const pattern of fallbackPatterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                const token = match[1].toUpperCase();
                if (!['USDT','USDC','EN','RU','USD','EUR'].includes(token)) {
                    if (API_CONFIG.debug)  console.log('Fallback CEX pair token found:', token);
                    return token;
                }
            }
        }
        return null;
    }
    static extractTickerFromCEX(url, hostname) {
        const cexPatterns = {
            'binance.com': [
                /\/trade\/([A-Z]{1,10})_USDT/i,
                /symbol=([A-Z]{1,10})USDT/i
            ],
            'okx.com': [
                /\/trade-spot\/([A-Z]{1,10})-usdt/i,
                /\/trade\/([A-Z]{1,10})-USDT/i
            ],
            'bybit.com': [
                /\/trade\/spot\/([A-Z]{1,10})\/USDT/i,
                /symbol=([A-Z]{1,10})USDT/i
            ],
            'mexc.com': [
                /\/exchange\/([A-Z]{1,10})_USDT/i
            ],
            'gate.io': [
                /\/trade\/([A-Z]{1,10})_USDT/i
            ],
            'kucoin.com': [
                /\/trade\/([A-Z]{1,10})-USDT/i
            ],
            'huobi.com': [
                /\/en-us\/trade\/([A-Z]{1,10})_usdt/i,
                /symbol=([A-Z]{1,10})usdt/i
            ],
            'htx.com': [
                /\/trade\/([A-Z]{1,10})_usdt/i
            ],
            'poloniex.com': [
                /\/ru\/trade\/([A-Z]{1,10})_USDT/i
            ]
        };
        for (const domain in cexPatterns) {
            if (hostname.includes(domain)) {
                const patterns = cexPatterns[domain];
                for (const pattern of patterns) {
                    const match = url.match(pattern);
                    if (match && match[1]) {
                        const ticker = match[1].toUpperCase();
                        if (!['USDT', 'USDC', 'BUSD', 'FDUSD'].includes(ticker)) {
                            if (API_CONFIG.debug)  console.log(`CEX ticker found on ${domain}:`, ticker);
                            return ticker;
                        }
                    }
                }
            }
        }
        return null;
    }
    static extractFromSpecialSites(url, hostname) {
        if (hostname.includes('dexscreener.com')) {
            const match = url.match(/dexscreener\.com\/[a-z0-9-]+\/([^\/]+)/i);
            if (match) {
                if (API_CONFIG.debug) console.log('DexScreener token found:', match[1]);
                return match[1];
            }
        }
        if (hostname.includes('gmgn.ai')) {
            const match = url.match(/gmgn\.ai\/[a-z]+\/token\/[a-z0-9-]+\/([^\/]+)/i);
            if (match) {
                if (API_CONFIG.debug)  console.log('GMGN token found:', match[1]);
                return match[1];
            }
        }
        if (hostname.includes('dextools.io')) {
            const match = url.match(/dextools\.io\/.*\/pair-explorer\/(0x[a-f0-9]{40})/i);
            if (match) {
                if (API_CONFIG.debug) console.log('DexTools pair found:', match[1]);
                return match[1];
            }
        }
        return null;
    }
    static extractFromExplorers(url, hostname) {
        for (const chain in CHAIN_INFO) {
            const chainInfo = CHAIN_INFO[chain];
            const explorerDomain = chainInfo.explorer_base.replace('https://', '');
            if (hostname.includes(explorerDomain)) {
                const patterns = [
                    /\/(?:address|token|contract)\/([0-9a-fA-Fx]{40,})/,
                    /\/([0-9a-fA-Fx]{40,})/,
                    /#\/contract\/([0-9a-fA-Fx]{40,})/,
                    /#\/token20\/([0-9a-fA-Fx]{40,})/
                ];
                for (const pattern of patterns) {
                    const match = url.match(pattern);
                    if (match) {
                        if (API_CONFIG.debug)  console.log(`${chain} explorer token found:`, match[1]);
                        return match[1];
                    }
                }
            }
        }
        return null;
    }
    static extractGenericToken(url) {
        const patterns = [
            /([0-9a-fA-if]{42})/,
            /([a-zA-Z0-9]{43,44})/,
            /([0-9a-fA-Fx]{40,})/
        ];
        for (const pattern of patterns) {
            const matches = url.match(pattern);
            if (matches) {
                const token = matches[1];
                if (token.length >= 40 && !token.match(/^(0x)?0+$/)) {
                    if (API_CONFIG.debug)  console.log('Generic token found:', token);
                    return token;
                }
            }
        }
        if (API_CONFIG.debug)  console.log('No token found in URL');
        return null;
    }
    static extractDomainFromTemplate(template) {
        try {
            const url = template.replace(/\{[^}]+\}/g, 'placeholder');
            const domain = new URL(url).hostname;
            return domain.replace('www.', '');
        } catch (error) {
            return '';
        }
    }
    static getBaseDomain(host) {
        if (!host) return '';
        const clean = host.replace(/^www\./i, '');
        const parts = clean.split('.');
        if (parts.length <= 2) return clean;
        return parts.slice(-2).join('.');
    }
}