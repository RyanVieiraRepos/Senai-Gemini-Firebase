const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const rateLimitMiddleware = require('../middleware/rateLimit');
const imcController = require('../controllers/imc.controller');

router.post(
  '/calculate',
  authMiddleware,
  rateLimitMiddleware,
  imcController.calculate
);

module.exports = router;
