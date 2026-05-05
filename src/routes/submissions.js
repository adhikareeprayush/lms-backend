const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const Enrollment = require('../models/Enrollment');
const { authenticate, authorize } = require('../middleware/auth');
const { ensureCourseStaff } = require('../utils/courseAccess');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Submissions
 *   description: Assignment submissions and grading
 */

/**
 * @swagger
 * /api/v1/submissions/my:
 *   get:
 *     summary: Current student's submissions
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 */
router.get('/my', authenticate, authorize('student'), async (req, res, next) => {
  try {
    const submissions = await Submission.find({ student: req.user._id })
      .populate('assignment', 'title course dueDate maxPoints')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, count: submissions.length, data: submissions });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/submissions/assignment/{assignmentId}:
 *   get:
 *     summary: List submissions for an assignment (instructor/admin)
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/assignment/:assignmentId',
  authenticate,
  authorize('instructor', 'admin'),
  [param('assignmentId').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }

      const assignment = await Assignment.findById(req.params.assignmentId);
      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Assignment not found' });
      }

      const staff = await ensureCourseStaff(req.user, assignment.course);
      if (!staff.ok) {
        return res.status(staff.status).json({ success: false, message: staff.message });
      }

      const submissions = await Submission.find({ assignment: assignment._id })
        .populate('student', 'firstName lastName email')
        .sort({ updatedAt: -1 });

      res.status(200).json({ success: true, count: submissions.length, data: submissions });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/submissions:
 *   post:
 *     summary: Create or update submission (student)
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  authenticate,
  authorize('student'),
  [
    body('assignment').isMongoId(),
    body('textContent').optional().isString(),
    body('fileUrl').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }

      const assignment = await Assignment.findById(req.body.assignment);
      if (!assignment || !assignment.isPublished) {
        return res.status(404).json({ success: false, message: 'Assignment not found' });
      }

      const enrollment = await Enrollment.findOne({
        student: req.user._id,
        course: assignment.course,
        status: 'active'
      });
      if (!enrollment) {
        return res.status(403).json({ success: false, message: 'You must be enrolled in this course' });
      }

      if (!req.body.textContent && !req.body.fileUrl) {
        return res.status(400).json({
          success: false,
          message: 'Provide textContent or fileUrl'
        });
      }

      let submission = await Submission.findOne({
        assignment: assignment._id,
        student: req.user._id
      });

      if (submission && submission.status === 'graded') {
        return res.status(400).json({
          success: false,
          message: 'Submission already graded; contact instructor if you need a resubmit'
        });
      }

      if (submission) {
        submission.textContent = req.body.textContent ?? submission.textContent;
        submission.fileUrl = req.body.fileUrl ?? submission.fileUrl;
        submission.status = 'submitted';
        await submission.save();
      } else {
        submission = await Submission.create({
          assignment: assignment._id,
          student: req.user._id,
          textContent: req.body.textContent,
          fileUrl: req.body.fileUrl,
          status: 'submitted'
        });
      }

      logger.info(`Submission saved ${submission._id} for assignment ${assignment._id}`);

      res.status(201).json({ success: true, message: 'Submission saved', data: submission });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/submissions/{id}/grade:
 *   patch:
 *     summary: Grade a submission
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/:id/grade',
  authenticate,
  authorize('instructor', 'admin'),
  [
    param('id').isMongoId(),
    body('grade').isFloat({ min: 0 }),
    body('feedback').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }

      const submission = await Submission.findById(req.params.id).populate('assignment');
      if (!submission) {
        return res.status(404).json({ success: false, message: 'Submission not found' });
      }

      const assignment = submission.assignment;
      const staff = await ensureCourseStaff(req.user, assignment.course);
      if (!staff.ok) {
        return res.status(staff.status).json({ success: false, message: staff.message });
      }

      const maxPoints = assignment.maxPoints || 100;
      if (req.body.grade > maxPoints) {
        return res.status(400).json({
          success: false,
          message: `Grade cannot exceed maxPoints (${maxPoints})`
        });
      }

      submission.grade = req.body.grade;
      submission.feedback = req.body.feedback;
      submission.status = 'graded';
      submission.gradedBy = req.user._id;
      submission.gradedAt = new Date();
      await submission.save();

      const pct = maxPoints > 0 ? Math.round((req.body.grade / maxPoints) * 100) : 0;
      const enrollment = await Enrollment.findOne({
        student: submission.student,
        course: assignment.course,
        status: 'active'
      });
      if (enrollment) {
        await enrollment.markAssignmentCompleted(assignment._id, pct);
      }

      res.status(200).json({ success: true, message: 'Submission graded', data: submission });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/submissions/{id}:
 *   get:
 *     summary: Get submission by ID
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, [param('id').isMongoId()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const submission = await Submission.findById(req.params.id).populate('assignment');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (req.user.role === 'student') {
      if (submission.student.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      return res.status(200).json({ success: true, data: submission });
    }

    if (req.user.role === 'admin') {
      return res.status(200).json({ success: true, data: submission });
    }

    if (req.user.role === 'instructor') {
      const staff = await ensureCourseStaff(req.user, submission.assignment.course);
      if (!staff.ok) {
        return res.status(staff.status).json({ success: false, message: staff.message });
      }
      return res.status(200).json({ success: true, data: submission });
    }

    return res.status(403).json({ success: false, message: 'Access denied' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
