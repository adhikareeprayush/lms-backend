const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const enrollmentRoutes = require('./routes/enrollments');
const lessonRoutes = require('./routes/lessons');
const assignmentRoutes = require('./routes/assignments');
const quizRoutes = require('./routes/quizzes');
const submissionRoutes = require('./routes/submissions');
const moduleRoutes = require('./routes/modules');
const reviewRoutes = require('./routes/reviews');

const errorHandler = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');

const app = express();

if (process.env.VERCEL) {
  app.set('trust proxy', 1);
  const { connectDB } = require('./config/database');
  app.use(async (req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (err) {
      next(err);
    }
  });
}

function buildSwaggerServers() {
  const servers = [];
  if (process.env.VERCEL_URL) {
    const host = process.env.VERCEL_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    servers.push({
      url: `https://${host}`,
      description: 'Vercel deployment'
    });
  }
  servers.push({
    url: `http://localhost:${process.env.PORT || 5000}`,
    description: 'Local development'
  });
  return servers;
}

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  })
);

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(mongoSanitize());
app.use(xss());

app.use(compression());

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LMS Backend API',
      version: '1.0.0',
      description: 'Learning Management System Backend API Documentation',
      contact: {
        name: 'API Support',
        email: 'support@yourlms.com'
      }
    },
    servers: buildSwaggerServers(),
    tags: [
      { name: 'Authentication', description: 'Register, login, profile' },
      { name: 'Users', description: 'User administration' },
      { name: 'Courses', description: 'Catalog and course authoring' },
      { name: 'Modules', description: 'Course sections' },
      { name: 'Lessons', description: 'Lesson content' },
      { name: 'Enrollments', description: 'Student enrollments' },
      { name: 'Assignments', description: 'Assignments' },
      { name: 'Submissions', description: 'Assignment submissions and grading' },
      { name: 'Quizzes', description: 'Quizzes and attempts' },
      { name: 'Reviews', description: 'Course reviews' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/models/*.js']
};

const specs = swaggerJsdoc(swaggerOptions);
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'LMS API Documentation'
  })
);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', authenticate, userRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/enrollments', authenticate, enrollmentRoutes);
app.use('/api/v1/modules', moduleRoutes);
app.use('/api/v1/lessons', lessonRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/quizzes', quizRoutes);
app.use('/api/v1/submissions', authenticate, submissionRoutes);
app.use('/api/v1/reviews', reviewRoutes);

app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

app.use(errorHandler);

module.exports = app;
