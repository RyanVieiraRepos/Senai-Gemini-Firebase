const express = require('express');
const router = express.Router();
const resultsController = require('../controllers/results.controller');

router.get('/all', resultsController.getAll);

module.exports = router;
