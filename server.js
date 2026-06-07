require('dotenv').config();

const express = require('express');
const profileRoutes = require('./routes/profileRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'GitHub Profile Analyzer API is running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/profiles', profileRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`GitHub Profile Analyzer API listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
