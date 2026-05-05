const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Review = require('../models/Review');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { authenticate, authorize, optionalAuthenticate } = require('../middleware/auth');
const { canAccessCourseContent } = require('../utils/courseAccess');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Course reviews
 */

/**
 * @swagger
 * /api/v1/reviews/course/{courseId}:
 *   get:
 *     summary: List reviews for a course
 *     tags: [Reviews]
 */
router.get(
  '/course/:courseId',
  optionalAuthenticate,
  [param('courseId').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }

      const access = await canAccessCourseContent(req.user || null, req.params.courseId);
      if (!access.ok) {
        return res.status(access.status).json({ success: false, message: access.message });
      }

      const reviews = await Review.find({ course: req.params.courseId })
        .populate('student', 'firstName lastName avatar')
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, count: reviews.length, data: reviews });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/reviews:
 *   post:
 *     summary: Create or update your review for a course
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  authenticate,
  authorize('student'),
  [
    body('course').isMongoId(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().isString().isLength({ max: 2000 })
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }

      const enrollment = await Enrollment.findOne({
        student: req.user._id,
        course: req.body.course,
        status: 'active'
      });
      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in the course to leave a review'
        });
      }

      const review = await Review.findOneAndUpdate(
        { course: req.body.course, student: req.user._id },
        {
          course: req.body.course,
          student: req.user._id,
          rating: req.body.rating,
          comment: req.body.comment
        },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );

      const course = await Course.findById(req.body.course);
      if (course && typeof course.updateRating === 'function') {
        await course.updateRating();
      }

      logger.info(`Review upserted for course ${req.body.course}`);

      res.status(201).json({ success: true, message: 'Review saved', data: review });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/reviews/{id}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authenticate, [param('id').isMongoId()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const isOwner = review.student.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await review.deleteOne();

    const course = await Course.findById(review.course);
    if (course && typeof course.updateRating === 'function') {
      await course.updateRating();
    }

    res.status(200).json({ success: true, message: 'Review deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
