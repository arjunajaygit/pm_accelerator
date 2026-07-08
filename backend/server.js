
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const weatherRoutes = require('./routes/weather');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});


const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/atmosphere';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully.');
    console.log(`   Database: ${MONGO_URI.split('/').pop().split('?')[0]}`);
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('   Ensure MongoDB is running and MONGO_URI is correct in .env');
  });


app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to ATMOSPHERE API',
    version: '1.0.0',
    endpoints: {
      weather: '/api/weather',
      health: '/api/health'
    }
  });
});

app.use('/api/weather', weatherRoutes);


app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    service: 'ATMOSPHERE Backend',
    version: '1.0.0',
    database: dbStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});


if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.resolve(__dirname, '../frontend', 'dist', 'index.html'));
  });
} else {
  
  app.use((req, res) => {
    res.status(404).json({
      status: 'error',
      type: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found.`
    });
  });
}


app.use(errorHandler);


app.listen(PORT, () => {
  console.log(`\n🌤️  ATMOSPHERE Server running on port ${PORT}`);
  console.log(`   API Base: http://localhost:${PORT}/api`);
  console.log(`   Health:   http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
