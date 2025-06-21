// Additional barcode endpoints for the server

// Get product by barcode
app.get('/api/productbarcode/:barcode', async (req, res) => {
    try {
        const { barcode } = req.params;
        
        if (!barcode) {
            return res.status(400).json({ error: 'Barcode is required' });
        }

        const result = await pool.query(
            'SELECT * FROM products WHERE barcode = $1',
            [barcode]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Product not found',
                message: `No product found with barcode: ${barcode}`
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        handleError(res, error, 'Failed to fetch product by barcode');
    }
});

// Search products by barcode (partial match)
app.get('/api/products/search/barcode/:searchTerm', async (req, res) => {
    try {
        const { searchTerm } = req.params;
        
        if (!searchTerm) {
            return res.status(400).json({ error: 'Search term is required' });
        }

        const result = await pool.query(
            'SELECT * FROM products WHERE barcode ILIKE $1 ORDER BY name',
            [`%${searchTerm}%`]
        );

        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Failed to search products by barcode');
    }
});

// Get all products with barcodes
app.get('/api/products/with-barcodes', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM products WHERE barcode IS NOT NULL AND barcode != \'\' ORDER BY name'
        );
        res.json(result.rows);
    } catch (error) {
        handleError(res, error, 'Failed to fetch products with barcodes');
    }
}); 