// import express from 'express';
// import cors from 'cors';
// import helmet from 'helmet';
// import morgan from 'morgan';
// import compression from 'compression';
// import cookieParser from 'cookie-parser';
// import session from 'express-session';
// import MongoStore from 'connect-mongo';
// import rateLimit from 'express-rate-limit';
// import { createServer } from 'http';
// import { Server as SocketIOServer } from 'socket.io';

// import { specs, swaggerUi, swaggerUiOptions } from "./utils/swaggers"
// import { connectDB } from './config/database';
// import { logger } from './utils/loggers';
// import { errorHandler } from './middleware/errorHandler';
// import { notFound} from './middleware/notfound'

// // Route imports
// import authRoutes from './routes/auth'
// import userRoutes from './routes/users';
// import itemRoutes from './routes/Items';
// // import messageRoutes from '@/routes/messages';
// import uploadRoutes from './routes/upload';
// import adminRoutes from './routes/admin';

// // Socket handlers
// // import { initializeSocket } from '@/socket/socketHandler';

// // Load environment variables
// import dotenv from 'dotenv';
// dotenv.config();

// const app = express();
// // Swagger documentation


// const server = createServer(app);
// const io = new SocketIOServer(server, {
//   cors: {
//     origin: process.env.FRONTEND_URL || "http://localhost:3000",
//     methods: ["GET", "POST"]
//   }
// });

// const PORT = 5001;

// // Connect to MongoDB
// connectDB();

// // Rate limiting
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
//   message: 'Too many requests from this IP, please try again later.',
//   standardHeaders: true,
//   legacyHeaders: false,
// });


// app.use(helmet());
// app.use(cors({
//   origin: process.env.FRONTEND_URL || "http://localhost:3000",
//   credentials: true
// }));
// app.use(compression());
// app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// app.use(cookieParser());

// // Session configuration
// app.use(session({
//   secret: process.env.SESSION_SECRET || 'fallback-secret',
//   resave: false,
//   saveUninitialized: false,
//   store: MongoStore.create({
//     mongoUrl: process.env.MONGODB_URI
//   }),
//   cookie: {
//     secure: process.env.NODE_ENV === 'production',
//     httpOnly: true,
//     maxAge: 24 * 60 * 60 * 1000 // 24 hours
//   }
// }));

// // Apply rate limiting
// app.use('/api/', limiter);

// // Health check
// app.get('/health', (req, res) => {
//   res.status(200).json({
//     status: 'OK',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime()
//   });
// });

// // API Routes
// const apiVersion = process.env.API_VERSION || 'v1';
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));
// app.use(`/api/${apiVersion}/auth`, authRoutes);
// app.use(`/api/${apiVersion}/users`, userRoutes);
// app.use(`/api/${apiVersion}/items`, itemRoutes);
// // app.use(`/api/${apiVersion}/messages`, messageRoutes);
// app.use(`/api/${apiVersion}/upload`, uploadRoutes);
// app.use(`/api/${apiVersion}/admin`, adminRoutes);

// // Initialize Socket.IO
// // initializeSocket(io);

// // Error handling middleware
// app.use(notFound);
// app.use(errorHandler);
// app.use(`/api/${apiVersion}/auth`, authRoutes);
// // Start server
// server.listen(PORT, () => {
//   logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
//   logger.info(`API available at http://localhost:${PORT}/api/${apiVersion}`);
// });

// // Graceful shutdown
// process.on('SIGTERM', () => {
//   logger.info('SIGTERM received, shutting down gracefully');
//   server.close(() => {
//     logger.info('Process terminated');
//   });
// });

// export default app;
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './utils/swaggers';
import { logger } from './utils/loggers';
import { errorHandler } from './middleware/errorHandler';
import authMiddleware from './middleware/auth';
import cookieParser from 'cookie-parser';
// Import routes
import itemRoutes from './routes/Items';

import userRoutes from './routes/users'
import notificationRoutes from './routes/notifications';

dotenv.config();

// Extend Express Request interface to include `io`
declare global {
  namespace Express {
    interface Request {
      io?: Server;
    }
  }
}

dotenv.config();
const app = express();
const server = createServer(app);

// Fixed Socket.IO CORS configuration
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000", 
      "http://127.0.0.1:3000",
      process.env.FRONTEND_URL || "http://localhost:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  allowEIO3: true // Optional: for backward compatibility
});

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});
app.use('/api/', limiter);

// Updated CORS configuration for Express
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000", 
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Attach io to req
app.use((req: Request, res: Response, next: NextFunction) => {
  req.io = io;
  next();
});
app.use(cookieParser());

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lost-found')
  .then(() => logger.info('Connected to MongoDB'))
  .catch((error) => logger.error('MongoDB connection error:', error));

// Routes
app.use('/api/items', itemRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  
  // Handle user joining their specific room
  socket.on('join', (room: string) => {
    socket.join(room);
    logger.info(`Socket ${socket.id} joined room: ${room}`);
  });
  
  // Also handle the join_user_room event for compatibility
  socket.on('join_user_room', (userId: string) => {
    socket.join(`user_${userId}`);
    logger.info(`User ${userId} joined their room`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use(errorHandler);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 404 handler
app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export { app, io };