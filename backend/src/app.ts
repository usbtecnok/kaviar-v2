import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRoutes } from './routes';
import { errorHandler, notFound } from './middlewares/error';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
}));
app.options("*", cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', apiRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
