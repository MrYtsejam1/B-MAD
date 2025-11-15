import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import formRoutes from './routes/form.routes';

dotenv.config();

const app: Application = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
});
app.use('/api/', limiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(express.static('dist/public'));

app.use('/api/v1/forms', formRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;
