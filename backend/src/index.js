const express = require('express');
const cors = require('cors');
require('dotenv').config();

const imcRoutes = require('./routes/imc.routes');
const resultsRoutes = require('./routes/results.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/imc', imcRoutes);
app.use('/api/results', resultsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
