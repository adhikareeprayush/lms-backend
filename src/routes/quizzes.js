const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Quiz = require('../models/Quiz');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { authenticate, authorize, optionalAuthenticate } = require('../middleware/auth');
const { ensureCourseStaff, canAccessCourseContent } = require('../utils/courseAccess');
const logger = require('../config/logger');

const router = express.Router();

function sanitizeQuizForStudent(quizDoc) {
  const quiz =
    typeof quizDoc.toObject === 'function'
      ? quizDoc.toObject()
      : JSON.parse(JSON.stringify(quizDoc));
  if (quiz.questions) {
    quiz.questions = quiz.questions.map((q) => {
      const copy = { ...q };
      delete copy.correctAnswer;
      return copy;
    });
  }
  return quiz;
}

function scoreSubmission(quiz, answers) {
  if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
    return { valid: false, message: 'Provide one answer per question' };
  }

  let earned = 0;
  let total = 0;

  quiz.questions.forEach((q, idx) => {
    const pts = q.points !== undefined ? q.points : 1;
    total += pts;
    const given = answers[idx];

    if (q.type === 'multiple_choice') {
      if (typeof q.correctAnswer === 'number' && given === q.correctAnswer) {
        earned += pts;
      }
    } else if (q.type === 'true_false') {
      if (given === q.correctAnswer) {
        earned += pts;
      }
    } else if (q.type === 'short_answer') {
      const a = String(given || '')
        .trim()
        .toLowerCase();
      const b = String(q.correctAnswer || '')
        .trim()
        .toLowerCase();
      if (a && b && a === b) {
        earned += pts;
      }
    }
  });

  const percentage = total > 0 ? Math.round((earned / total) * 100) : 0;
  return { valid: true, percentage };
}

/**
 * @swagger
 * tags:
 *   name: Quizzes
 *   description: Course quizzes
 */

/**
 * @swagger
 * /api/v1/quizzes/course/{courseId}:
 *   get:
 *     summary: List quizzes for a course
 *     tags: [Quizzes]
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

      const filter = { course: req.params.courseId };
      const isStaff =
        req.user &&
        (req.user.role === 'admin' ||
          (req.user.role === 'instructor' &&
            access.course.instructor.toString() === req.user._id.toString()));

      if (!isStaff) {
        filter.isPublished = true;
      }

      const quizzesRaw = await Quiz.find(filter).lean();
      const data = isStaff ? quizzesRaw : quizzesRaw.map((q) => sanitizeQuizForStudent(q));

      res.status(200).json({
        success: true,
        count: data.length,
        data
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/quizzes/{id}/attempt:
 *   post:
 *     summary: Submit quiz answers (student)
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:id/attempt',
  authenticate,
  authorize('student'),
  [
    param('id').isMongoId(),
    body('answers').isArray({ min: 1 })
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }

      const quiz = await Quiz.findById(req.params.id);
      if (!quiz || !quiz.isPublished) {
        return res.status(404).json({ success: false, message: 'Quiz not found' });
      }

      const enrollment = await Enrollment.findOne({
        student: req.user._id,
        course: quiz.course,
        status: 'active'
      });
      if (!enrollment) {
        return res.status(403).json({ success: false, message: 'You must be enrolled in this course' });
      }

      const result = scoreSubmission(quiz, req.body.answers);
      if (!result.valid) {
        return res.status(400).json({ success: false, message: result.message });
      }

      await enrollment.markQuizCompleted(quiz._id, result.percentage);

      const passed = result.percentage >= (quiz.passingScore || 70);

      res.status(200).json({
        success: true,
        message: 'Quiz submitted',
        data: {
          scorePercent: result.percentage,
          passingScore: quiz.passingScore || 70,
          passed
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/quizzes/{id}:
 *   get:
 *     summary: Get quiz by ID
 *     tags: [Quizzes]
 */
router.get('/:id', optionalAuthenticate, [param('id').isMongoId()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const access = await canAccessCourseContent(req.user || null, quiz.course);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const isStaff =
      req.user &&
      (req.user.role === 'admin' ||
        (req.user.role === 'instructor' &&
          access.course.instructor.toString() === req.user._id.toString()));

    if (!quiz.isPublished && !isStaff && !access.enrollment) {
      return res.status(403).json({ success: false, message: 'Quiz not available' });
    }

    const payload = isStaff ? quiz : sanitizeQuizForStudent(quiz);
    res.status(200).json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/quizzes:
 *   post:
 *     summary: Create quiz
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  authenticate,
  authorize('instructor', 'admin'),
  [
    body('course').isMongoId(),
    body('title').trim().notEmpty(),
    body('description').optional().isString(),
    body('timeLimitMinutes').optional().isInt({ min: 1 }),
    body('passingScore').optional().isFloat({ min: 0, max: 100 }),
    body('questions').isArray({ min: 1 }),
    body('isPublished').optional().isBoolean()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }

      const staff = await ensureCourseStaff(req.user, req.body.course);
      if (!staff.ok) {
        return res.status(staff.status).json({ success: false, message: staff.message });
      }

      const quiz = await Quiz.create(req.body);

      await Course.findByIdAndUpdate(req.body.course, {
        $inc: { 'stats.totalQuizzes': 1 }
      });

      logger.info(`Quiz created ${quiz._id}`);
      res.status(201).json({ success: true, message: 'Quiz created', data: quiz });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/quizzes/{id}:
 *   put:
 *     summary: Update quiz
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/:id',
  authenticate,
  authorize('instructor', 'admin'),
  [
    param('id').isMongoId(),
    body('title').optional().trim().notEmpty(),
    body('description').optional().isString(),
    body('timeLimitMinutes').optional().isInt({ min: 1 }),
    body('passingScore').optional().isFloat({ min: 0, max: 100 }),
    body('questions').optional().isArray({ min: 1 }),
    body('isPublished').optional().isBoolean()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }

      const quiz = await Quiz.findById(req.params.id);
      if (!quiz) {
        return res.status(404).json({ success: false, message: 'Quiz not found' });
      }

      const staff = await ensureCourseStaff(req.user, quiz.course);
      if (!staff.ok) {
        return res.status(staff.status).json({ success: false, message: staff.message });
      }

      Object.assign(quiz, req.body);
      await quiz.save();

      res.status(200).json({ success: true, message: 'Quiz updated', data: quiz });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/quizzes/{id}:
 *   delete:
 *     summary: Delete quiz
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:id',
  authenticate,
  authorize('instructor', 'admin'),
  [param('id').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }

      const quiz = await Quiz.findById(req.params.id);
      if (!quiz) {
        return res.status(404).json({ success: false, message: 'Quiz not found' });
      }

      const staff = await ensureCourseStaff(req.user, quiz.course);
      if (!staff.ok) {
        return res.status(staff.status).json({ success: false, message: staff.message });
      }

      const courseId = quiz.course;
      await quiz.deleteOne();

      await Course.findByIdAndUpdate(courseId, {
        $inc: { 'stats.totalQuizzes': -1 }
      });

      res.status(200).json({ success: true, message: 'Quiz deleted' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
