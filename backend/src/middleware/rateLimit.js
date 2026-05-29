const { db } = require('../config/firebase');

module.exports = async (req, res, next) => {
  const userId = req.userId;
  const ipAddress = req.ipAddress;
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Check user ID rate limit
    const userLimitDoc = db.collection('rate_limits').doc(`${userId}_${today}`);
    const userLimitSnapshot = await userLimitDoc.get();
    const userCount = userLimitSnapshot.exists ? userLimitSnapshot.data().count : 0;
    
    if (userCount >= 2) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Maximum 2 calculations per day allowed (user)'
      });
    }
    
    // Check IP address rate limit
    const ipLimitDoc = db.collection('ip_rate_limits').doc(`${ipAddress}_${today}`);
    const ipLimitSnapshot = await ipLimitDoc.get();
    const ipCount = ipLimitSnapshot.exists ? ipLimitSnapshot.data().count : 0;
    
    if (ipCount >= 2) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Maximum 2 calculations per day allowed (IP address)'
      });
    }
    
    req.remainingCalculations = 2 - userCount;
    next();
  } catch (error) {
    console.error('Rate limit check error:', error);
    res.status(500).json({ error: 'Rate limit check failed' });
  }
};
