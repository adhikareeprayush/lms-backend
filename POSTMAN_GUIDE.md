# LMS Backend API - Postman Collection Guide

This guide explains how to use the Postman collection for testing and interacting with the LMS Backend API.

## 📥 Import Instructions

### 1. Import Collection

1. Open Postman
2. Click **Import** button
3. Select `LMS_Backend_API.postman_collection.json`
4. Click **Import**

### 2. Import Environment

1. Click the **Environments** tab in Postman
2. Click **Import**
3. Select `LMS_Backend_Environment.postman_environment.json`
4. Click **Import**
5. Select **LMS Backend Environment** from the environment dropdown

## 🚀 Getting Started

### Step 1: Set Up Environment

- Ensure your API server is running on `http://localhost:5000`
- If using a different URL, update the `base_url` environment variable

### Step 2: Seed Database (Optional)

```bash
npm run seed
```

This creates sample users and courses for testing.

### Step 3: Authentication Flow

1. **Register User** (optional) - Create a new account
2. **Login User** - Use existing credentials or newly created account
3. **Token Auto-Extraction** - The JWT token is automatically saved to environment variables

## 🔐 Authentication

### Sample Credentials (After Seeding)

- **Admin**: `admin@lms.com` / `Admin123!`
- **Instructor**: `instructor@lms.com` / `Instructor123!`
- **Student**: `student@lms.com` / `Student123!`

### How Authentication Works

1. **Login/Register** - Get JWT token
2. **Auto Token Storage** - Token automatically saved to `auth_token` environment variable
3. **Automatic Headers** - Token automatically included in protected routes

## 📁 Collection Structure

### 1. Authentication

- **Register User** - Create new account
- **Login User** - Authenticate and get token
- **Get Current User Profile** - Get authenticated user info
- **Update User Profile** - Update user information
- **Change Password** - Change user password
- **Verify Token** - Validate JWT token
- **Logout User** - Logout (client-side)

### 2. Courses

- **Get All Courses** - Browse courses with filtering/pagination
- **Get Course by ID** - Get detailed course information
- **Create Course** - Create new course (Instructor/Admin)
- **Update Course** - Update course details (Instructor/Admin)
- **Delete Course** - Remove course (Instructor/Admin)
- **Publish/Unpublish Course** - Control course visibility
- **Get Course Categories** - Get category statistics
- **Get Course Statistics** - Get platform statistics (Admin)

### 3. Enrollments

- **Enroll in Course** - Register for a course (Student)
- **Get My Enrollments** - View user's enrolled courses

### 4. Users

- **Get All Users** - List all users (Admin)
- **Get User by ID** - Get specific user profile

### 5. System

- **Health Check** - Verify API server status

### 6. Coming Soon

- **Lessons** - Lesson management (Under development)
- **Assignments** - Assignment system (Under development)
- **Quizzes** - Quiz and assessment system (Under development)

## 🧪 Testing Scenarios

### Scenario 1: Student Journey

1. **Register** as a student
2. **Browse courses** using the Get All Courses endpoint
3. **View course details** using Get Course by ID
4. **Enroll in a course** using the enrollment endpoint
5. **Check enrollments** using Get My Enrollments

### Scenario 2: Instructor Journey

1. **Login** as instructor
2. **Create a new course**
3. **Update course details**
4. **Publish the course**
5. **View course statistics**

### Scenario 3: Admin Management

1. **Login** as admin
2. **View all users**
3. **View platform statistics**
4. **Manage courses** (full access)

## 🔍 Query Parameters Reference

### Get All Courses Parameters

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 50)
- `category` - Filter by category (e.g., "programming", "web-development")
- `level` - Filter by level ("beginner", "intermediate", "advanced")
- `price` - Filter by price type ("free", "paid")
- `search` - Search in title and description
- `sort` - Sort by ("newest", "oldest", "popular", "rating", "price_low", "price_high")

### Example Usage

```
GET /api/v1/courses?category=programming&level=beginner&sort=popular&limit=5
```

## 📝 Request Body Examples

### Register User

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "role": "student"
}
```

### Create Course

```json
{
  "title": "Advanced React Development",
  "description": "Master advanced React concepts...",
  "shortDescription": "Advanced React course...",
  "category": "web-development",
  "level": "advanced",
  "price": 199.99,
  "duration": 50,
  "learningObjectives": ["Master React hooks", "Implement state management"]
}
```

### Enroll in Course

```json
{
  "courseId": "507f1f77bcf86cd799439011"
}
```

## 🛠️ Environment Variables

| Variable        | Description              | Example                 |
| --------------- | ------------------------ | ----------------------- |
| `base_url`      | API server URL           | `http://localhost:5000` |
| `auth_token`    | JWT authentication token | Auto-set after login    |
| `user_id`       | Current user ID          | Auto-extracted          |
| `course_id`     | Sample course ID         | For testing             |
| `admin_email`   | Admin email              | `admin@lms.com`         |
| `student_email` | Student email            | `student@lms.com`       |

## 🔄 Automatic Features

### Token Management

- **Auto-Extraction**: Tokens automatically extracted from login/register responses
- **Auto-Headers**: Authorization headers automatically added to protected routes
- **Token Verification**: Built-in token validation endpoint

### Response Validation

- **Response Time**: Checks response time < 2000ms
- **Status Codes**: Validates successful response codes
- **JSON Structure**: Validates response structure

## 🚨 Error Handling

### Common HTTP Status Codes

- **200** - Success
- **201** - Created successfully
- **400** - Bad request / Validation error
- **401** - Unauthorized / Invalid token
- **403** - Forbidden / Insufficient permissions
- **404** - Resource not found
- **429** - Too many requests (rate limited)
- **500** - Internal server error

### Error Response Format

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "details": "Additional error information"
  }
}
```

## 🔧 Troubleshooting

### Server Not Responding

1. Verify server is running: `npm run dev`
2. Check the `base_url` environment variable
3. Verify MongoDB connection

### Authentication Issues

1. Check if token exists in environment variables
2. Try login again to refresh token
3. Verify user credentials
4. Check token expiration (7 days default)

### Permission Errors

1. Verify user role (student/instructor/admin)
2. Check if user owns the resource
3. Ensure proper authentication

## 📊 Monitoring and Logging

### Response Logging

- All requests automatically log to console
- Response times are tracked
- Error responses are highlighted

### Performance Testing

- Built-in response time validation
- Load testing recommendations available
- Monitoring hooks for CI/CD integration

## 🚀 Advanced Usage

### Batch Testing

Use Postman's Collection Runner to:

1. Test complete user journeys
2. Validate API performance
3. Run regression tests

### CI/CD Integration

Use Newman (Postman CLI) for:

```bash
newman run LMS_Backend_API.postman_collection.json -e LMS_Backend_Environment.postman_environment.json
```

### API Documentation

The collection automatically generates documentation available at:

- Postman web interface
- Export to HTML/Markdown
- Share with team members

## 📞 Support

For issues with the API collection:

1. Check server logs
2. Verify environment setup
3. Review API documentation at `/api-docs`
4. Check the repository README.md

---

**Happy Testing! 🎉**

This collection provides comprehensive testing capabilities for the LMS Backend API. Update the environment variables as needed for your specific setup.
