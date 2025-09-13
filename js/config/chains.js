const CHAIN_INFO = {
    "eth": {
        "explorer_base": "https://etherscan.io",
        "contract_link": "https://etherscan.io/address/{contract}",
        "holders_link": "https://etherscan.io/token/tokenholderchart/{contract}",
        "okx_chain": "1"
    },
    "bsc": {
        "explorer_base": "https://bscscan.com",
        "contract_link": "https://bscscan.com/address/{contract}",
        "holders_link": "https://bscscan.com/token/tokenholderchart/{contract}",
        "okx_chain": "56"
    },
    "pol": {
        "explorer_base": "https://polygonscan.com",
        "contract_link": "https://polygonscan.com/address/{contract}",
        "holders_link": "https://polygonscan.com/token/tokenholderchart/{contract}",
        "okx_chain": "137"
    },
    "arb": {
        "explorer_base": "https://arbiscan.io",
        "contract_link": "https://arbiscan.io/address/{contract}",
        "holders_link": "https://arbiscan.io/token/tokenholderchart/{contract}",
        "okx_chain": "42161"
    },
    "avc": {
        "explorer_base": "https://snowtrace.io",
        "contract_link": "https://snowtrace.io/address/{contract}",
        "holders_link": "https://snowtrace.io/token/tokenholderchart/{contract}",
        "okx_chain": "43114"
    },
    "base": {
        "explorer_base": "https://basescan.org",
        "contract_link": "https://basescan.org/address/{contract}",
        "holders_link": "https://basescan.org/token/tokenholderchart/{contract}",
        "okx_chain": "8453"
    },
    "opt": {
        "explorer_base": "https://optimistic.etherscan.io",
        "contract_link": "https://optimistic.etherscan.io/address/{contract}",
        "holders_link": "https://optimistic.etherscan.io/token/tokenholderchart/{contract}",
        "okx_chain": "10"
    },
    "sol": {
        "explorer_base": "https://solscan.io",
        "contract_link": "https://solscan.io/token/{contract}",
        "holders_link": "https://solscan.io/token/{contract}#holders",
        "okx_chain": "501"
    },
    "ton": {
        "explorer_base": "https://tonscan.org",
        "contract_link": "https://tonscan.org/token/{contract}",
        "holders_link": "https://tonscan.org/token/{contract}",
        "okx_chain": "607"
    },
    "tron": {
        "explorer_base": "https://tronscan.org",
        "contract_link": "https://tronscan.org/#/contract/{contract}",
        "holders_link": "https://tronscan.org/#/token20/{contract}/holders",
        "okx_chain": "195"
    },
    "sui": {
        "explorer_base": "https://suivision.xyz",
        "contract_link": "https://suivision.xyz/token/{contract}",
        "holders_link": "https://suivision.xyz/token/{contract}#holders",
        "okx_chain": "784"
    }
};
const ALLOWED_NETWORKS = [
    "ton",
    "bsc",
    "sol",
    "eth",
    "pol",
    "base",
    "opt",
    "avax",
    "tron",
    "arb",
    "sui"
];
const CHAIN_NAME_MAPPING = {
    "ton": "ton",
    "toncoin": "ton",
    "openton": "ton",
    "bep20": "bsc",
    "bep20(bsc)": "bsc",
    "bsc": "bsc",
    "bnb": "bsc",
    "bsc_bnb": "bsc",
    "bnbsmartchain": "bsc",
    "op-bnb": "bsc",
    "opbnb": "bsc",
    "sol": "sol",
    "solana": "sol",
    "spl": "sol",
    "sol-sol": "sol",
    "eth": "eth",
    "erc20": "eth",
    "ethereum": "eth",
    "polygon": "pol",
    "matic": "pol",
    "polygon(bridged)": "pol",
    "polygon(bridged)": "pol",
    "polpoly": "pol",
    "polygonbridged": "pol",
    "base": "base",
    "base-eth": "base",
    "baseeth": "base",
    "baseevm": "base",
    "ethbase": "base",
    "optimism": "opt",
    "op": "opt",
    "ethop": "opt",
    "opt": "opt",
    "optimism(v2)": "opt",
    "optimismbridged": "opt",
    "opeth": "opt",
    "opteth": "opt",
    "avaxc": "avax",
    "avax": "avax",
    "avax-c": "avax",
    "avalanche": "avax",
    "avaxc-chain": "avax",
    "ava_c-chain": "avax",
    "ava": "avax",
    "avax_c": "avax",
    "avaxcchain": "avax",
    "avaxx": "avax",
    "avaxx-chain": "avax",
    "avaxcchain": "avax",
    "avaxc-chain": "avax",
    "avaxc_chain": "avax",
    "avaxcchain": "avax",
    "avac": "avax",
    "trc20": "tron",
    "trx": "tron",
    "arbitrum": "arb",
    "arbitrumone": "arb",
    "arbitrumone(bridged)": "arb",
    "arb": "arb",
    "arbone": "arb",
    "arbi": "arb",
    "arbevm": "arb",
    "etharb": "arb",
    "arbi-nova": "arb",
    "arbieth": "arb",
    "arbinova": "arb",
    "arbitrum_nova": "arb",
    "arbnova": "arb",
    "sui": "sui",
};
function isNetworkAllowed(networkName) {
    if (!networkName) return false;
    const normalizedName = CHAIN_NAME_MAPPING[networkName.toLowerCase()] || networkName.toLowerCase();
    return ALLOWED_NETWORKS.includes(normalizedName);
}
function normalizeNetworkName(networkName) {
    if (!networkName) return null;
    return CHAIN_NAME_MAPPING[networkName.toLowerCase()] || networkName.toLowerCase();
}
function getDisplayNetworkName(networkName) {
    const normalized = normalizeNetworkName(networkName);
    if (!normalized) return networkName;
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}