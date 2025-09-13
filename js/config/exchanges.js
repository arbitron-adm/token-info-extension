const CEX_LINKS = {
    "bitget": {
        "deposit": "https://www.bitget.com/ru/asset/recharge",
        "withdraw": "https://www.bitget.com/ru/asset/withdraw",
        "spot": "https://www.bitget.com/ru/spot/{token.upper()}USDT",
        "futures": "https://www.bitget.com/ru/futures/usdt/{token.upper()}USDT",
    },
    "gateio": {
        "deposit": "https://www.gate.io/ru/myaccount/deposit/{token}",
        "withdraw": "https://www.gate.io/ru/myaccount/withdraw/{token}",
        "spot": "https://www.gate.io/ru/trade/{token.upper()}_USDT",
        "futures": "https://www.gate.io/ru/futures/USDT/{token.upper()}_USDT",
    },
    "gate": {
        "deposit": "https://www.gate.io/ru/myaccount/deposit/{token}",
        "withdraw": "https://www.gate.io/ru/myaccount/withdraw/{token}",
        "spot": "https://www.gate.io/ru/trade/{token.upper()}_USDT",
        "futures": "https://www.gate.io/ru/futures/USDT/{token.upper()}_USDT",
    },
    "gateio": {
        "deposit": "https://www.gate.com/ru/myaccount/deposit/{token}",
        "withdraw": "https://www.gate.com/ru/myaccount/withdraw/{token}",
        "spot": "https://www.gate.com/ru/trade/{token.upper()}_USDT",
        "futures": "https://www.gate.com/ru/futures/USDT/{token.upper()}_USDT",
    },
    "gate": {
        "deposit": "https://www.gate.com/ru/myaccount/deposit/{token}",
        "withdraw": "https://www.gate.com/ru/myaccount/withdraw/{token}",
        "spot": "https://www.gate.com/ru/trade/{token.upper()}_USDT",
        "futures": "https://www.gate.com/ru/futures/USDT/{token.upper()}_USDT",
    },
    "mexc": {
        "deposit": "https://www.mexc.com/ru-RU/assets/deposit/{token}",
        "withdraw": "https://www.mexc.com/ru-RU/assets/withdraw/{token}",
        "spot": "https://www.mexc.com/ru-RU/exchange/{token.upper()}_USDT",
        "futures": "https://www.mexc.com/ru-RU/futures/{token.upper()}_USDT",
    },
    "bybit": {
        "deposit": "https://www.bybit.com/user/assets/deposit",
        "withdraw": "https://www.bybit.com/user/assets/withdraw",
        "spot": "https://www.bybit.com/en/trade/spot/{token.upper()}/USDT",
        "futures": "https://www.bybit.com/trade/usdt/{token.upper()}USDT",
    },
    "bingx": {
        "deposit": "https://bingx.com/ru-ru/assets/recharge/",
        "withdraw": "https://bingx.com/ru-ru/assets/withdraw/",
        "spot": "https://bingx.com/ru-ru/spot/{token.upper()}USDT/",
        "futures": "https://bingx.com/ru-ru/perpetual/{token.upper()}-USDT/",
    },
    "huobi": {
        "deposit": "https://www.htx.com/en-us/finance/deposit/{token}",
        "withdraw": "https://www.htx.com/en-us/finance/withdraw/{token}",
        "spot": "https://www.htx.com/trade/{token.lower()}_usdt",
        "futures": "https://www.htx.com/futures/linear_swap/exchange#contract_code={token.upper()}-USDT",
    },
    "bitmart": {
        "deposit": "https://www.bitmart.com/asset-deposit",
        "withdraw": "https://www.bitmart.com/asset-withdrawal",
        "spot": "https://www.bitmart.com/trade/en-US?symbol={token.upper()}_USDT",
        "futures": "https://derivatives.bitmart.com/en-US?symbol={token.upper()}USDT",
    },
    "kucoin": {
        "deposit": "https://www.kucoin.com/ru/assets/coin/{token}",
        "withdraw": "https://www.kucoin.com/ru/assets/withdraw/{token}",
        "spot": "https://www.kucoin.com/ru/trade/{token.upper()}-USDT",
        "futures": "https://www.kucoin.com/ru/futures/trade/{token.upper()}USDTM",
    },
    "lbank": {
        "deposit": "https://www.lbank.com/wallet/account/main/deposit/crypto/{token}",
        "withdraw": "https://www.lbank.com/wallet/account/main/withdrawal/crypto/{token}",
        "spot": "https://www.lbank.com/trade/{token.lower()}_usdt",
        "futures": "https://www.lbank.com/futures/{token.lower()}usdt",
    },
    "xt": {
        "deposit": "https://www.xt.com/ru/accounts/assets/wallet/deposit",
        "withdraw": "https://www.xt.com/ru/accounts/assets/wallet/withdraw",
        "spot": "https://www.xt.com/ru/trade/{token.lower()}_usdt",
        "futures": "https://www.xt.com/ru/futures/trade/{token.lower()}_usdt",
    },
    "poloniex": {
        "deposit": "https://poloniex.com/ru/profile/deposit",
        "withdraw": "https://poloniex.com/ru/profile/withdraw",
        "spot": "https://poloniex.com/ru/trade/{token.upper()}_USDT",
        "futures": "https://poloniex.com/ru/futures/trade/{token.upper()}_USDT_PERP",
    },
    "okx": {
        "deposit": "https://www.okx.com/ru/balance/recharge/{token}",
        "withdraw": "https://www.okx.com/ru/balance/withdrawal/{token}",
        "spot": "https://www.okx.com/ru/trade-spot/{token.lower()}-usdt",
        "futures": "https://www.okx.com/ru/trade-swap/{token.lower()}-usdt-swap",
    },
    "binance": {
        "deposit": "https://www.binance.com/ru/my/wallet/account/main/deposit/crypto/{token}",
        "withdraw": "https://www.binance.com/ru/my/wallet/account/main/withdrawal/crypto/{token}",
        "spot": "https://www.binance.com/ru/trade/{token.upper()}_USDT",
        "futures": "https://www.binance.com/ru/futures/{token.upper()}USDT",
    },
    "coinex": {
        "deposit": "https://www.coinex.com/ru/asset/deposit?type={token}",
        "withdraw": "https://www.coinex.com/ru/asset/withdraw?type={token}",
        "spot": "https://www.coinex.com/ru/trade/{token.upper()}_USDT",
        "futures": "https://www.coinex.com/ru/futures/{token.lower()}-usdt",
    }
};