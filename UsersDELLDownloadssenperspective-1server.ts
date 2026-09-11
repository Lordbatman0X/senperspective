import 'dotenv/config';
import express from 'express';
import path from 'path';
import { connectToMongoDB, isConnected, getDb } from './server/lib/mongodb';
import authRoutes from './server/routes/auth';
import dataRoutes from './server/routes/data';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Connect to MongoDB
console.log('[Server] Starting...');
connectToMongoDB().then(() => {
  console.log(`[Server] MongoDB connected: ${isConnected()}`);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: isConnected() 
  });
});

// MongoDB status
app.get('/api/mongodb/status', (req, res) => {
  res.json({ connected: isConnected() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', dataRoutes);

// Serve static files (Firebase Hosting fallback)
const distPath = path.join(__dirname, 'dist');
if (require('fs').existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Server] API: http://localhost:${PORT}/api`);
});

export { app };
