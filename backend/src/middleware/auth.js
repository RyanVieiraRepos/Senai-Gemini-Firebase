const { v4: uuidv4 } = require('uuid');

module.exports = (req, res, next) => {
  let userId = req.headers['x-user-id'];
  
  if (!userId) {
    userId = uuidv4();
  }
  
  // Extract IP address
  const ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
                    req.connection.remoteAddress ||
                    req.socket.remoteAddress ||
                    req.connection.socket?.remoteAddress;
  
  req.userId = userId;
  req.ipAddress = ipAddress;
  next();
};
