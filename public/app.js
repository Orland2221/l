import { CONFIG, decryptApiKey } from './config.js';
// State
let isAuthenticated = false;
let apiKey = null;
let currentChart = null;
let selectedStock = null;

// Login Handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('passwordInput').value;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (hashHex === CONFIG.PASSWORD_HASH) {
        // Decrypt API key
        apiKey = decryptApiKey(CONFIG.ENCRYPTED_API_KEY, CONFIG.SALT);
        
        if (!apiKey) {
            showError('Configuration error. Please check setup.');
            return;
        }
        
        isAuthenticated = true;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        document.getElementById('passwordInput').value = '';
    } else {
        showError('Incorrect password');
    }
});

function showError(message) {
    document.getElementById('loginError').textContent = message;
    setTimeout(() => {
        document.getElementById('loginError').textContent = '';
    }, 3000);
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    isAuthenticated = false;
    apiKey = null;
    selectedStock = null;
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
});

// Mode Switching
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.mode-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        document.getElementById(mode + 'Mode').classList.add('active');
    });
});

// Stock Search
document.getElementById('searchBtn').addEventListener('click', searchStocks);
document.getElementById('stockSearch').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchStocks();
});

async function searchStocks() {
    const query = document.getElementById('stockSearch').value.trim();
    if (!query) return;
    
    showLoader();
    try {
        const response = await fetch(`/api/stock-search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        displaySearchResults(data.quotes || []);
    } catch (error) {
        console.error('Search error:', error);
        alert('Error searching stocks. Please try again.');
    } finally {
        hideLoader();
    }
}

function displaySearchResults(results) {
    const container = document.getElementById('searchResults');
    
    if (results.length === 0) {
        container.innerHTML = '<p>No results found. Try a different search term.</p>';
        return;
    }
    
    container.innerHTML = results.map(result => `
        <div class="search-result-item">
            <div class="result-info">
                <h4>${result.symbol}</h4>
                <p>${result.longname || result.shortname || 'N/A'}</p>
                <small>${result.exchange || ''} | ${result.quoteType || 'EQUITY'}</small>
            </div>
            <button class="select-btn" onclick="selectStock('${result.symbol}', '${(result.longname || result.shortname || result.symbol).replace(/'/g, "\\'")}')">
                Select
            </button>
        </div>
    `).join('');
}

window.selectStock = async function(symbol, name) {
    selectedStock = { symbol, name };
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('stockSearch').value = '';
    await loadStockDetails(symbol, name);
};

document.getElementById('clearStock').addEventListener('click', () => {
    selectedStock = null;
    document.getElementById('stockDetails').style.display = 'none';
    document.getElementById('stockSearch').value = '';
});

async function loadStockDetails(symbol, name) {
    showLoader();
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1y&interval=1d`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch stock data');
        }
        
        const data = await response.json();
        
        if (!data.chart.result || data.chart.result.length === 0) {
            throw new Error('No data found');
        }
        
        const result = data.chart.result[0];
        const quote = result.indicators.quote[0];
        const timestamps = result.timestamp;
        
        document.getElementById('stockName').textContent = `${name} (${symbol})`;
        document.getElementById('stockDetails').style.display = 'block';
        
        const currentPrice = quote.close[quote.close.length - 1];
        const previousPrice = quote.close[quote.close.length - 2];
        const change = currentPrice - previousPrice;
        const changePercent = (change / previousPrice) * 100;
        
        const metrics = [
            { label: 'Current Price', value: `$${currentPrice.toFixed(2)}`, change: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`, positive: changePercent >= 0 },
            { label: 'Volume', value: quote.volume[quote.volume.length - 1].toLocaleString() },
            { label: 'High', value: `$${Math.max(...quote.high.filter(v => v)).toFixed(2)}` },
            { label: 'Low', value: `$${Math.min(...quote.low.filter(v => v)).toFixed(2)}` }
        ];
        
        displayMetrics(metrics);
        displayChart(timestamps, quote.close, symbol);
        
    } catch (error) {
        console.error('Load error:', error);
        alert('Error loading stock data. Please try a different symbol.');
    } finally {
        hideLoader();
    }
}
function displayMetrics(metrics) {
    const grid = document.getElementById('metricsGrid');
    grid.innerHTML = metrics.map(m => `
        <div class="metric-card">
            <div class="metric-label">${m.label}</div>
            <div class="metric-value">${m.value}</div>
            ${m.change ? `<div class="metric-change ${m.positive ? 'positive' : 'negative'}">${m.change}</div>` : ''}
        </div>
    `).join('');
}

function displayChart(timestamps, prices, symbol) {
    const ctx = document.getElementById('priceChart');
    
    if (currentChart) {
        currentChart.destroy();
    }
    
    const dates = timestamps.map(ts => new Date(ts * 1000).toLocaleDateString());
    const validPrices = prices.filter(p => p !== null);
    
    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: symbol,
                data: validPrices,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `${symbol} Stock Price - 1 Year`
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// AI Analysis
document.getElementById('getAnalysisBtn').addEventListener('click', async () => {
    const question = document.getElementById('analysisQuestion').value.trim();
    if (!question || !selectedStock) return;
    
    showLoader();
    try {
        const analysis = await getAIResponse(
            `Analyze ${selectedStock.symbol} stock and answer: ${question}`,
            'financial_analyst'
        );
        document.getElementById('analysisResult').textContent = analysis;
    } catch (error) {
        alert('Error getting AI analysis. Please check your API key.');
        console.error(error);
    } finally {
        hideLoader();
    }
});

// Financial Advice
document.getElementById('getAdviceBtn').addEventListener('click', async () => {
    const customQ = document.getElementById('customQuestion').value.trim();
    const quickQ = document.getElementById('quickQuestions').value;
    const question = customQ || quickQ;
    
    if (!question) return;
    
    showLoader();
    try {
        const advice = await getAIResponse(question, 'financial_advisor');
        document.getElementById('adviceResult').textContent = advice;
    } catch (error) {
        alert('Error getting financial advice. Please check your API key.');
        console.error(error);
    } finally {
        hideLoader();
    }
});

// Portfolio Analysis
document.getElementById('analyzePortfolioBtn').addEventListener('click', async () => {
    const input = document.getElementById('portfolioInput').value.trim();
    if (!input) return;
    
    const symbols = input.split('\n').map(s => s.trim().toUpperCase()).filter(s => s);
    
    showLoader();
    try {
        const portfolioData = [];
        
        for (const symbol of symbols) {
            try {
                const response = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?range=1mo&interval=1d`);
                const data = await response.json();
                
                if (data.chart.result && data.chart.result.length > 0) {
                    const result = data.chart.result[0];
                    const quote = result.indicators.quote[0];
                    const currentPrice = quote.close[quote.close.length - 1];
                    const previousPrice = quote.close[quote.close.length - 2];
                    const change = ((currentPrice - previousPrice) / previousPrice) * 100;
                    
                    portfolioData.push({
                        symbol,
                        price: currentPrice.toFixed(2),
                        change: change.toFixed(2),
                        volume: quote.volume[quote.volume.length - 1].toLocaleString()
                    });
                }
            } catch (e) {
                console.error(`Error fetching ${symbol}:`, e);
            }
        }
        
        displayPortfolioResults(portfolioData);
        
        // Get AI analysis
        const analysis = await getAIResponse(
            `Analyze this portfolio: ${symbols.join(', ')}. Provide insights on diversification and performance.`,
            'financial_analyst'
        );
        document.getElementById('portfolioAnalysis').textContent = analysis;
        
    } catch (error) {
        alert('Error analyzing portfolio. Please try again.');
        console.error(error);
    } finally {
        hideLoader();
    }
});

function displayPortfolioResults(data) {
    const container = document.getElementById('portfolioResults');
    
    if (data.length === 0) {
        container.innerHTML = '<p>No valid symbols found.</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="portfolio-table">
            <thead>
                <tr>
                    <th>Symbol</th>
                    <th>Price</th>
                    <th>Change (%)</th>
                    <th>Volume</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(stock => `
                    <tr>
                        <td><strong>${stock.symbol}</strong></td>
                        <td>${stock.price}</td>
                        <td class="${parseFloat(stock.change) >= 0 ? 'positive' : 'negative'}">
                            ${parseFloat(stock.change) >= 0 ? '+' : ''}${stock.change}%
                        </td>
                        <td>${stock.volume}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// OpenAI API Call
async function getAIResponse(prompt, role = 'financial_advisor') {
    const systemPrompts = {
        financial_analyst: `You are a professional financial analyst. Provide accurate, insightful analysis based on the data.
Always include relevant disclaimers about investment risks. Be concise but thorough. Keep responses under 500 words.`,
        financial_advisor: `You are a knowledgeable financial advisor. Provide helpful, educational financial advice with appropriate disclaimers.
Focus on general principles and educational content. Always remind users to consult qualified professionals. Keep responses under 400 words.`
    };
    
    const response = await fetch(CONFIG.OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: CONFIG.OPENAI_MODEL,
            messages: [
                { role: 'system', content: systemPrompts[role] },
                { role: 'user', content: prompt }
            ],
            max_tokens: 1000,
            temperature: 0.1
        })
    });
    
    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

// Utility Functions
function showLoader() {
    document.getElementById('loader').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('loader').style.display = 'none';
}