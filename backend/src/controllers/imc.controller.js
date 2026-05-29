const IMCService = require('../services/imc.service');

exports.calculate = async (req, res) => {
  try {
    const { peso, altura } = req.body;
    const userId = req.userId;
    const ipAddress = req.ipAddress;
    
    // Validation
    if (!peso || !altura || peso <= 0 || altura <= 0) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    
    if (peso > 500 || altura > 3 || altura < 0.5) {
      return res.status(400).json({ error: 'Invalid input range' });
    }
    
    const result = await IMCService.calculateAndStore(userId, ipAddress, peso, altura);
    
    res.json({
      success: true,
      result,
      remainingCalculations: req.remainingCalculations - 1
    });
  } catch (error) {
    console.error('Calculate error:', error);
    res.status(500).json({ error: error.message });
  }
};
