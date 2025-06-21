app.use(express.json({ 
  limit: '922kb',
  verify: (req, res, buf) => {
    if (buf.length > 922 * 1024) {
      throw new Error('Request entity too large');
    }
  }
}));
app.use(cors()); 