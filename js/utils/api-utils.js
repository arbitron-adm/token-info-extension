async function searchByTicker(ticker) {
    const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.SEARCH_BY_TICKER}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ticker: ticker
        })
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}
async function searchByContract(contract, type) {
    const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.SEARCH_BY_CONTRACT}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contract: contract
        })
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}
async function checkHealth() {
    const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.HEALTH}`, {
        method: 'GET'
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}
async function dexSearchByContract(contract) {
    const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.DEX_SEARCH_BY_CONTRACT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract })
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}