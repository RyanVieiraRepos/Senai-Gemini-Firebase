const IMCService = require('../services/imc.service');

exports.getAll = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const results = await IMCService.getAllResults(parseInt(limit));
    
    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: error.message });
  }
};
