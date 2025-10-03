export default async function handler(req, res) {
    const { symbol } = req.query;
    
    if (!symbol) {
        return res.status(400).json({ error: 'Symbol parameter required' });
    }
    
    try {
        const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1y&interval=1d`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            }
        );
        
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chart data' });
    }
}