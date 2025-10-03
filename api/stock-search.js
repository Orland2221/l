export default async function handler(req, res) {
    const { query } = req.query;
    
    if (!query) {
        return res.status(400).json({ error: 'Query parameter required' });
    }
    
    try {
        const response = await fetch(
            `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            }
        );
        
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
}