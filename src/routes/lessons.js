const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Lesson = require('../models/Lesson');
const Module = require('../models/Module');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { authenticate, authorize, optionalAuthenticate } = require('../middleware/auth');
const { ensureCourseStaff, canAccessCourseContent } = require('../utils/courseAccess');
const logger = require('../config/logger');

const router = express.Router();

const LESSON_TYPES = [
  'video',
  'text',
  'document',
  'audio',
  'interactive',
  'quiz',
  'assignment'
];

function lessonPayloadForViewer(lesson, access) {
  const doc = lesson.toObject ? lesson.toObject() : { ...lesson };
  const fullAccess =
    !!access.user &&
    (access.user.role === 'admin' ||
      (access.user.role === 'instructor' &&
        access.course &&
        access.course.instructor.toString() === access.user._id.toString()) ||
      !!access.enrollment);

  if (fullAccess) {
    return doc;
  }
  if (doc.isPreview || doc.isFree) {
    return doc;
  }
  delete doc.content;
  delete doc.attachments;
  delete doc.notes;
  return doc;
}

/**
 * @swagger
 * tags:
 *   name: Lessons
 *   description: Course lessons
 */

/**
 * @swagger
 * /api/v1/lessons/course/{courseId}:
 *   get:
 *     summary: List lessons for a course
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: module
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lessons list
 */
router.get(
  '/course/:courseId',
  optionalAuthenticate,
  [
    param('courseId').isMongoId(),
    query('module').optional().isMongoId()
  ],
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
      if (req.query.module) {
        filter.module = req.query.module;
      }

      const isStaff =
        req.user &&
        (req.user.role === 'admin' ||
          (req.user.role === 'instructor' &&
            access.course.instructor.toString() === req.user._id.toString()));

      if (!isStaff) {
        filter.isPublished = true;
      }

      let lessons = await Lesson.find(filter)
        .populate('module', 'title order')
        .sort({ order: 1 });

      const viewerAccess = { user: req.user, course: access.course, enrollment: access.enrollment };
      lessons = lessons.map((l) => lessonPayloadForViewer(l, viewerAccess));

      res.status(200).json({ success: true, count: lessons.length, data: lessons });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/lessons/{id}/complete:
 *   patch:
 *     summary: Mark lesson completed for current student
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/:id/complete',
  authenticate,
  authorize('student'),
  [param('id').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }

      const lesson = await Lesson.findById(req.params.id);
      if (!lesson) {
        return res.status(404).json({ success: false, message: 'Lesson not found' });
      }

      const enrollment = await Enrollment.findOne({
        student: req.user._id,
        course: lesson.course,
        status: 'active'
      });
      if (!enrollment) {
        return res.status(403).json({ success: false, message: 'You must be enrolled in this course' });
      }

      await enrollment.markLessonCompleted(lesson._id);

      const updated = await Enrollment.findById(enrollment._id);

      res.status(200).json({
        success: true,
        message: 'Lesson marked complete',
        data: { progress: updated.progress }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/lessons/{id}/publish:
 *   patch:
 *     summary: Publish or unpublish a lesson
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/:id/publish',
  authenticate,
  authorize('instructor', 'admin'),
  [
    param('id').isMongoId(),
    body('isPublished').isBoolean()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }

      const lesson = await Lesson.findById(req.params.id);
      if (!lesson) {
        return res.status(404).json({ success: false, message: 'Lesson not found' });
      }

      const staff = await ensureCourseStaff(req.user, lesson.course);
      if (!staff.ok) {
        return res.status(staff.status).json({ success: false, message: staff.message });
      }

      lesson.isPublished = req.body.isPublished;
      await lesson.save();

      res.status(200).json({ success: true, message: 'Lesson updated', data: lesson });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/lessons/{id}:
 *   get:
 *     summary: Get lesson by ID
 *     tags: [Lessons]
 */
router.get('/:id', optionalAuthenticate, [param('id').isMongoId()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const lesson = await Lesson.findById(req.params.id).populate('module', 'title order');
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    const access = await canAccessCourseContent(req.user || null, lesson.course);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const isStaff =
      req.user &&
      (req.user.role === 'admin' ||
        (req.user.role === 'instructor' &&
          access.course.instructor.toString() === req.user._id.toString()));

    if (!lesson.isPublished && !isStaff && !(access.enrollment && access.course.isPublished)) {
      return res.status(403).json({ success: false, message: 'Lesson not available' });
    }

    const viewerAccess = { user: req.user, course: access.course, enrollment: access.enrollment };
    const payload = lessonPayloadForViewer(lesson, viewerAccess);

    res.status(200).json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/lessons:
 *   post:
 *     summary: Create lesson
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  authenticate,
  authorize('instructor', 'admin'),
  [
    body('course').isMongoId(),
    body('module').isMongoId(),
    body('title').trim().notEmpty().isLength({ max: 100 }),
    body('type').isIn(LESSON_TYPES),
    body('duration').isFloat({ min: 1 }),
    body('order').isInt({ min: 1 }),
    body('description').optional().isString(),
    body('content').optional(),
    body('isPublished').optional().isBoolean(),
    body('isPreview').optional().isBoolean(),
    body('isFree').optional().isBoolean()
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

      const mod = await Module.findById(req.body.module);
      if (!mod || mod.course.toString() !== req.body.course) {
        return res.status(400).json({ success: false, message: 'Module does not belong to this course' });
      }

      const lesson = await Lesson.create(req.body);

      await Course.findByIdAndUpdate(req.body.course, {
        $inc: { 'stats.totalLessons': 1 }
      });

      logger.info(`Lesson created ${lesson._id} for course ${req.body.course}`);
      res.status(201).json({ success: true, message: 'Lesson created', data: lesson });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/lessons/{id}:
 *   put:
 *     summary: Update lesson
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/:id',
  authenticate,
  authorize('instructor', 'admin'),
  [
    param('id').isMongoId(),
    body('module').optional().isMongoId(),
    body('title').optional().trim().notEmpty(),
    body('type').optional().isIn(LESSON_TYPES),
    body('duration').optional().isFloat({ min: 1 }),
    body('order').optional().isInt({ min: 1 }),
    body('description').optional().isString(),
    body('content').optional(),
    body('isPublished').optional().isBoolean(),
    body('isPreview').optional().isBoolean(),
    body('isFree').optional().isBoolean()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }

      const lesson = await Lesson.findById(req.params.id);
      if (!lesson) {
        return res.status(404).json({ success: false, message: 'Lesson not found' });
      }

      const staff = await ensureCourseStaff(req.user, lesson.course);
      if (!staff.ok) {
        return res.status(staff.status).json({ success: false, message: staff.message });
      }

      if (req.body.module) {
        const mod = await Module.findById(req.body.module);
        if (!mod || mod.course.toString() !== lesson.course.toString()) {
          return res.status(400).json({ success: false, message: 'Invalid module for this course' });
        }
      }

      Object.assign(lesson, req.body);
      await lesson.save();

      res.status(200).json({ success: true, message: 'Lesson updated', data: lesson });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/lessons/{id}:
 *   delete:
 *     summary: Delete lesson
 *     tags: [Lessons]
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

      const lesson = await Lesson.findById(req.params.id);
      if (!lesson) {
        return res.status(404).json({ success: false, message: 'Lesson not found' });
      }

      const staff = await ensureCourseStaff(req.user, lesson.course);
      if (!staff.ok) {
        return res.status(staff.status).json({ success: false, message: staff.message });
      }

      const courseId = lesson.course;
      await lesson.deleteOne();

      await Course.findByIdAndUpdate(courseId, {
        $inc: { 'stats.totalLessons': -1 }
      });

      res.status(200).json({ success: true, message: 'Lesson deleted' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
