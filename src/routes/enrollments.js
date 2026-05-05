const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/v1/enrollments:
 *   post:
 *     summary: Enroll in a course
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *             properties:
 *               courseId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Enrolled successfully
 *       400:
 *         description: Already enrolled or validation error
 *       404:
 *         description: Course not found
 */
router.post(
  '/',
  authenticate,
  authorize('student'),
  [body('courseId').isMongoId().withMessage('Invalid course ID')],
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

      const { courseId } = req.body;

      // Check if course exists and is published
      const course = await Course.findById(courseId);
      if (!course || !course.isPublished) {
        return res.status(404).json({
          success: false,
          message: 'Course not found or not available'
        });
      }

      // Check if already enrolled
      const existingEnrollment = await Enrollment.findOne({
        student: req.user._id,
        course: courseId
      });

      if (existingEnrollment) {
        return res.status(400).json({
          success: false,
          message: 'Already enrolled in this course'
        });
      }

      // Create enrollment
      const enrollment = await Enrollment.create({
        student: req.user._id,
        course: courseId,
        paymentDetails: {
          amount: course.price,
          currency: course.currency || 'USD',
          paymentStatus: course.price === 0 ? 'completed' : 'pending'
        }
      });

      // Update course enrollment count
      await course.updateEnrollmentCount();

      // Populate enrollment data
      await enrollment.populate([
        { path: 'student', select: 'firstName lastName email' },
        { path: 'course', select: 'title description price' }
      ]);

      res.status(201).json({
        success: true,
        message: 'Enrolled successfully',
        data: enrollment
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/enrollments/my:
 *   get:
 *     summary: Get user's enrollments
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Enrollments retrieved successfully
 */
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user._id })
      .populate({
        path: 'course',
        select: 'title description thumbnail price level category instructor',
        populate: { path: 'instructor', select: 'firstName lastName avatar' }
      })
      .sort({ enrolledAt: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/enrollments/{id}:
 *   get:
 *     summary: Get enrollment by ID
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/:id',
  authenticate,
  [param('id').isMongoId()],
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

      const enrollment = await Enrollment.findById(req.params.id)
        .populate('student', 'firstName lastName email')
        .populate({
          path: 'course',
          select: 'title instructor',
          populate: { path: 'instructor', select: 'firstName lastName email' }
        });

      if (!enrollment) {
        return res.status(404).json({ success: false, message: 'Enrollment not found' });
      }

      const sid = enrollment.student.id || enrollment.student._id || enrollment.student;
      const owns = sid.toString() === req.user._id.toString();

      const instructorRef = enrollment.course.instructor;
      const instructorId = instructorRef?.id || instructorRef?._id || instructorRef;
      const isCourseInstructor =
        req.user.role === 'instructor' &&
        instructorId &&
        instructorId.toString() === req.user._id.toString();

      if (req.user.role !== 'admin' && !owns && !isCourseInstructor) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      res.status(200).json({ success: true, data: enrollment });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/enrollments/{id}:
 *   delete:
 *     summary: Drop out of a course (student) or remove enrollment (admin)
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:id',
  authenticate,
  [param('id').isMongoId()],
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

      const enrollment = await Enrollment.findById(req.params.id);
      if (!enrollment) {
        return res.status(404).json({ success: false, message: 'Enrollment not found' });
      }

      const owns = enrollment.student.toString() === req.user._id.toString();
      if (req.user.role !== 'admin' && !(req.user.role === 'student' && owns)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const courseId = enrollment.course;
      await enrollment.deleteOne();

      const course = await Course.findById(courseId);
      if (course) {
        await course.updateEnrollmentCount();
      }

      res.status(200).json({ success: true, message: 'Enrollment removed' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
