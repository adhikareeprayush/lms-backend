const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

// Middleware to authenticate user with JWT token
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Check if token is in the authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check if token is in cookies (for browser requests)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token (exclude password)
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token is valid but user no longer exists'
        });
      }

      // Check if user account is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated'
        });
      }

      // Add user to request object
      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

// Middleware to authorize user based on roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
};

// Middleware to check if user owns the resource or is admin
const authorizeResourceOwner = (resourceUserField = 'user') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.'
      });
    }

    // Admin can access all resources
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.resource
      ? req.resource[resourceUserField]
      : req.params.userId || req.body[resourceUserField];

    if (!resourceUserId) {
      return res.status(400).json({
        success: false,
        message: 'Resource user information not found'
      });
    }

    if (req.user._id.toString() !== resourceUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }

    next();
  };
};

// Middleware to check if user is instructor of the course
const authorizeInstructor = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.'
      });
    }

    // Admin can access all courses
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user is instructor
    if (req.user.role !== 'instructor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Instructor role required.'
      });
    }

    // If course ID is provided, check if user is the instructor of that course
    const courseId = req.params.courseId || req.body.course;
    if (courseId) {
      const Course = require('../models/Course');
      const course = await Course.findById(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      if (course.instructor.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not the instructor of this course.'
        });
      }

      // Add course to request for use in controller
      req.course = course;
    }

    next();
  } catch (error) {
    logger.error('Instructor authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authorization'
    });
  }
};

// Middleware to check if user is enrolled in the course
const authorizeEnrollment = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.'
      });
    }

    // Admin and instructors can access all courses
    if (req.user.role === 'admin' || req.user.role === 'instructor') {
      return next();
    }

    const courseId = req.params.courseId || req.body.course;
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    const Enrollment = require('../models/Enrollment');
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You must be enrolled in this course.'
      });
    }

    // Add enrollment to request for use in controller
    req.enrollment = enrollment;
    next();
  } catch (error) {
    logger.error('Enrollment authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during enrollment check'
    });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuthenticate = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Token is invalid or expired, but we don't fail the request
        logger.warn('Optional authentication failed:', error.message);
      }
    }

    next();
  } catch (error) {
    logger.error('Optional authentication error:', error);
    next(); // Continue even if there's an error
  }
};

module.exports = {
  authenticate,
  authorize,
  authorizeResourceOwner,
  authorizeInstructor,
  authorizeEnrollment,
  optionalAuthenticate
};
