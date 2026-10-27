import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { Server as SocketIOServer } from 'socket.io';
import { initDatabase } from './db/database.js';
import { apiRouter } from './routes/apiRoutes.js';
import { setupSocketHandlers } from './socket/socketHandler.js';

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Initialize SQLite database schemas
initDatabase();

const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4000', 'http://127.0.0.1:4000'],
  credentials: true,
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    game: 'LOVE BATTLE',
    tagline: 'Two Hearts. One Arena. Endless Battles.',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api', apiRouter);

// Serve built frontend PWA if available
const possibleDistPaths = [
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(__dirname, '../../client/dist'),
];

let clientDistPath = possibleDistPaths.find((p) => fs.existsSync(p));
if (clientDistPath) {
  console.log(`📦 Serving static client PWA from ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath!, 'index.html'));
  });
}

// Initialize Socket.IO with CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 15000,
  pingInterval: 10000,
});

// Wire Socket.IO handlers
setupSocketHandlers(io);

server.listen(PORT, HOST, () => {
  console.log(`🌌 Our Little Universe Server running on http://${HOST}:${PORT}`);
  console.log(`📡 Realtime multiplayer listening via Socket.IO`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server gracefully...');
  server.close(() => {
    process.exit(0);
  });
});
