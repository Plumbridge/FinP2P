import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import * as YAML from 'yamljs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import healthRoutes from './routes/health';
import infoRoutes from './routes/info';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import assetRoutes from './routes/assets';
import transferRoutes from './routes/transfers';
import organizationRoutes from './routes/organization';
import transactionRoutes from './routes/transactions';


// Initialize express app
const app = express();

// Load OpenAPI specification
const swaggerDocument = YAML.load(path.join(__dirname, '../finp2p-router-api.yaml'));

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/health', healthRoutes);
app.use('/info', infoRoutes);
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/assets', assetRoutes);
app.use('/transfers', transferRoutes);
app.use('/organization', organizationRoutes);


// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    code: 500,
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FinP2P Router running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
});

export default app; // For testing