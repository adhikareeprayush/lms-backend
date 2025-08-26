const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const Course = require('../models/Course');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const {
  authenticate,
  authorize,
  authorizeInstructor,
  optionalAuthenticate
} = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @swagger
 * /api/v1/courses:
 *   get:
 *     summary: Get all courses with filtering and pagination
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *         description: Filter by difficulty level
 *       - in: query
 *         name: price
 *         schema:
 *           type: string
 *           enum: [free, paid]
 *         description: Filter by price type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of courses per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, popular, rating, price_low, price_high]
 *         description: Sort courses by
 *     responses:
 *       200:
 *         description: List of courses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 pagination:
 *                   type: object
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Course'
 */
router.get(
  '/',
  optionalAuthenticate,
  [
    query('category').optional().trim(),
    query('level').optional().isIn(['beginner', 'intermediate', 'advanced']),
    query('price').optional().isIn(['free', 'paid']),
    query('search').optional().trim(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('sort')
      .optional()
      .isIn(['newest', 'oldest', 'popular', 'rating', 'price_low', 'price_high'])
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // Extract query parameters
      const { category, level, price, search, page = 1, limit = 10, sort = 'newest' } = req.query;

      // Build query
      let query = { isPublished: true };

      // Apply filters
      if (category) {
        query.category = category;
      }

      if (level) {
        query.level = level;
      }

      if (price === 'free') {
        query.price = 0;
      } else if (price === 'paid') {
        query.price = { $gt: 0 };
      }

      if (search) {
        query.$text = { $search: search };
      }

      // Build sort object
      let sortObj = {};
      switch (sort) {
        case 'newest':
          sortObj.createdAt = -1;
          break;
        case 'oldest':
          sortObj.createdAt = 1;
          break;
        case 'popular':
          sortObj.enrollmentCount = -1;
          break;
        case 'rating':
          sortObj['rating.average'] = -1;
          break;
        case 'price_low':
          sortObj.price = 1;
          break;
        case 'price_high':
          sortObj.price = -1;
          break;
        default:
          sortObj.createdAt = -1;
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Execute query
      const courses = await Course.find(query)
        .populate('instructor', 'firstName lastName avatar bio')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();

      // Get total count for pagination
      const total = await Course.countDocuments(query);

      // Calculate pagination info
      const pagination = {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCourses: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      };

      res.status(200).json({
        success: true,
        count: courses.length,
        pagination,
        data: courses
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   get:
 *     summary: Get course by ID
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course retrieved successfully
 *       404:
 *         description: Course not found
 */
router.get(
  '/:id',
  optionalAuthenticate,
  [param('id').isMongoId().withMessage('Invalid course ID')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const course = await Course.findById(req.params.id)
        .populate('instructor', 'firstName lastName avatar bio')
        .populate('modules')
        .lean();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check if course is published or user has access
      if (
        !course.isPublished &&
        (!req.user ||
          (req.user.role !== 'admin' &&
            course.instructor._id.toString() !== req.user._id.toString()))
      ) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check if user is enrolled (if authenticated)
      let enrollment = null;
      if (req.user && req.user.role === 'student') {
        enrollment = await Enrollment.findOne({
          student: req.user._id,
          course: course._id
        });
      }

      res.status(200).json({
        success: true,
        data: {
          ...course,
          isEnrolled: !!enrollment,
          enrollment: enrollment
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/courses:
 *   post:
 *     summary: Create a new course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - shortDescription
 *               - category
 *               - level
 *               - price
 *               - duration
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               shortDescription:
 *                 type: string
 *               category:
 *                 type: string
 *               level:
 *                 type: string
 *               price:
 *                 type: number
 *               duration:
 *                 type: number
 *               learningObjectives:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Course created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 */
router.post(
  '/',
  authenticate,
  authorize('instructor', 'admin'),
  [
    body('title')
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Title must be between 5 and 100 characters'),
    body('description')
      .trim()
      .isLength({ min: 50, max: 2000 })
      .withMessage('Description must be between 50 and 2000 characters'),
    body('shortDescription')
      .trim()
      .isLength({ min: 20, max: 200 })
      .withMessage('Short description must be between 20 and 200 characters'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('level')
      .isIn(['beginner', 'intermediate', 'advanced'])
      .withMessage('Level must be beginner, intermediate, or advanced'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('duration').isFloat({ min: 0.5 }).withMessage('Duration must be at least 0.5 hours'),
    body('learningObjectives')
      .isArray({ min: 1 })
      .withMessage('At least one learning objective is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // Add instructor to course data
      const courseData = {
        ...req.body,
        instructor: req.user._id
      };

      const course = await Course.create(courseData);

      // Populate instructor data
      await course.populate('instructor', 'firstName lastName avatar bio');

      logger.info(`New course created: ${course.title} by ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Course created successfully',
        data: course
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   put:
 *     summary: Update course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course updated successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Course not found
 */
router.put(
  '/:id',
  authenticate,
  authorizeInstructor,
  [
    param('id').isMongoId().withMessage('Invalid course ID'),
    body('title').optional().trim().isLength({ min: 5, max: 100 }),
    body('description').optional().trim().isLength({ min: 50, max: 2000 }),
    body('shortDescription').optional().trim().isLength({ min: 20, max: 200 }),
    body('level').optional().isIn(['beginner', 'intermediate', 'advanced']),
    body('price').optional().isFloat({ min: 0 }),
    body('duration').optional().isFloat({ min: 0.5 })
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const course = await Course.findById(req.params.id);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check if user is the instructor or admin
      if (req.user.role !== 'admin' && course.instructor.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update your own courses.'
        });
      }

      // Fields that can't be updated once course is published
      const restrictedFields = ['instructor'];
      if (course.isPublished) {
        restrictedFields.push('category');
      }

      // Remove restricted fields from update data
      const updateData = { ...req.body };
      restrictedFields.forEach((field) => delete updateData[field]);

      const updatedCourse = await Course.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true
      }).populate('instructor', 'firstName lastName avatar bio');

      logger.info(`Course updated: ${updatedCourse.title} by ${req.user.email}`);

      res.status(200).json({
        success: true,
        message: 'Course updated successfully',
        data: updatedCourse
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   delete:
 *     summary: Delete course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course deleted successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Course not found
 */
router.delete(
  '/:id',
  authenticate,
  authorize('instructor', 'admin'),
  [param('id').isMongoId().withMessage('Invalid course ID')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const course = await Course.findById(req.params.id);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check if user is the instructor or admin
      if (req.user.role !== 'admin' && course.instructor.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only delete your own courses.'
        });
      }

      // Check if course has enrollments
      const enrollmentCount = await Enrollment.countDocuments({ course: course._id });
      if (enrollmentCount > 0 && req.user.role !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete course with active enrollments. Please contact admin.'
        });
      }

      await Course.findByIdAndDelete(req.params.id);

      logger.info(`Course deleted: ${course.title} by ${req.user.email}`);

      res.status(200).json({
        success: true,
        message: 'Course deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/courses/{id}/publish:
 *   patch:
 *     summary: Publish/unpublish course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isPublished:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Course publication status updated
 */
router.patch(
  '/:id/publish',
  authenticate,
  authorizeInstructor,
  [
    param('id').isMongoId().withMessage('Invalid course ID'),
    body('isPublished').isBoolean().withMessage('isPublished must be a boolean')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const course = await Course.findById(req.params.id);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check if user is the instructor or admin
      if (req.user.role !== 'admin' && course.instructor.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only publish your own courses.'
        });
      }

      course.isPublished = req.body.isPublished;
      if (req.body.isPublished && !course.publishedAt) {
        course.publishedAt = new Date();
      }

      await course.save();

      logger.info(
        `Course ${req.body.isPublished ? 'published' : 'unpublished'}: ${course.title} by ${req.user.email}`
      );

      res.status(200).json({
        success: true,
        message: `Course ${req.body.isPublished ? 'published' : 'unpublished'} successfully`,
        data: course
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/courses/categories:
 *   get:
 *     summary: Get course categories with counts
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await Course.getCoursesByCategory();

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/courses/stats:
 *   get:
 *     summary: Get course statistics
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/stats', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const stats = await Course.getCourseStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
