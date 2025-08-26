# LMS Backend API

A robust Learning Management System (LMS) backend built with Node.js, Express.js, and MongoDB. This API provides comprehensive functionality for managing courses, users, enrollments, and educational content.

## 🚀 Features

- **User Management**: Registration, authentication, profile management with role-based access control
- **Course Management**: Create, update, delete, and publish courses with rich content
- **Enrollment System**: Student enrollment tracking with progress monitoring
- **Content Organization**: Structured lessons, modules, assignments, and quizzes
- **Assessment Tools**: Quiz creation, assignment submission, and grading
- **Progress Tracking**: Detailed analytics and completion tracking
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **API Documentation**: Complete Swagger/OpenAPI documentation
- **File Upload Support**: Image and document upload capabilities
- **Search & Filtering**: Advanced course search and filtering options

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express Validator
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: Helmet, CORS, Rate Limiting, Input Sanitization
- **Logging**: Winston
- **File Upload**: Multer
- **Environment**: dotenv

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## 🔧 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd lms-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with your configuration:

   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/lms-backend
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=7d
   BCRYPT_SALT_ROUNDS=12
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the application**

   ```bash
   # Development mode with nodemon
   npm run dev

   # Production mode
   npm start
   ```

## 📖 API Documentation

Once the server is running, you can access the complete API documentation at:

```
http://localhost:5000/api-docs
```

The API documentation includes:

- Complete endpoint reference
- Request/response schemas
- Authentication requirements
- Example requests and responses
- Interactive API testing interface

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles

- **Student**: Can enroll in courses, submit assignments, take quizzes
- **Instructor**: Can create and manage courses, grade assignments
- **Admin**: Full system access and user management

## 🌐 API Endpoints

### Authentication

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user profile
- `PUT /api/v1/auth/update-profile` - Update user profile
- `PUT /api/v1/auth/change-password` - Change password
- `POST /api/v1/auth/logout` - Logout user

### Courses

- `GET /api/v1/courses` - Get all courses (with filtering and pagination)
- `GET /api/v1/courses/:id` - Get course by ID
- `POST /api/v1/courses` - Create new course (Instructor/Admin)
- `PUT /api/v1/courses/:id` - Update course (Instructor/Admin)
- `DELETE /api/v1/courses/:id` - Delete course (Instructor/Admin)
- `PATCH /api/v1/courses/:id/publish` - Publish/unpublish course

### Enrollments

- `POST /api/v1/enrollments` - Enroll in a course
- `GET /api/v1/enrollments/my` - Get user's enrollments

### Users

- `GET /api/v1/users` - Get all users (Admin only)
- `GET /api/v1/users/:id` - Get user by ID

## 📊 Database Schema

### Core Collections

- **Users**: User profiles, authentication data, preferences
- **Courses**: Course information, metadata, pricing
- **Enrollments**: Student-course relationships, progress tracking
- **Lessons**: Individual learning units within courses
- **Assignments**: Assignment details and submissions
- **Quizzes**: Quiz questions and student attempts

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- Rate limiting
- CORS protection
- Security headers with Helmet
- MongoDB injection prevention
- XSS protection

## 📝 Development

### Code Structure

```
src/
├── config/          # Configuration files
├── middleware/      # Custom middleware
├── models/          # Database models
├── routes/          # API routes
├── logs/           # Application logs
└── server.js       # Main application file
```

### Available Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run tests
npm run lint       # Run ESLint
npm run lint:fix   # Fix ESLint issues
npm run format     # Format code with Prettier
```

### Environment Variables

| Variable             | Description               | Default     |
| -------------------- | ------------------------- | ----------- |
| `NODE_ENV`           | Environment mode          | development |
| `PORT`               | Server port               | 5000        |
| `MONGODB_URI`        | MongoDB connection string | -           |
| `JWT_SECRET`         | JWT signing secret        | -           |
| `JWT_EXPIRE`         | JWT expiration time       | 7d          |
| `BCRYPT_SALT_ROUNDS` | Bcrypt salt rounds        | 12          |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🆘 Support

If you have any questions or need help with setup, please:

1. Check the API documentation at `/api-docs`
2. Review the environment setup in `.env.example`
3. Ensure MongoDB is running and accessible
4. Verify all environment variables are set correctly

## 🎯 Roadmap

- [ ] Payment integration
- [ ] Real-time messaging system
- [ ] Video streaming integration
- [ ] Advanced analytics dashboard
- [ ] Mobile app support
- [ ] Microservices architecture
- [ ] Docker containerization
- [ ] CI/CD pipeline setup

---

Built with ❤️ for education and learning.
