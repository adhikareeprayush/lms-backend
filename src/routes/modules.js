const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Module = require('../models/Module');
const { authenticate, authorize, optionalAuthenticate } = require('../middleware/auth');
const { ensureCourseStaff, canAccessCourseContent } = require('../utils/courseAccess');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Modules
 *   description: Course modules (sections)
 */

/**
 * @swagger
 * /api/v1/modules/course/{courseId}:
 *   get:
 *     summary: List modules for a course
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of modules
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

      const query = { course: req.params.courseId };
      const isStaff =
        req.user &&
        (req.user.role === 'admin' ||
          (req.user.role === 'instructor' &&
            access.course.instructor.toString() === req.user._id.toString()));

      if (!isStaff) {
        query.isPublished = true;
      }

      const modules = await Module.find(query).sort({ order: 1 });
      res.status(200).json({ success: true, count: modules.length, data: modules });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/modules/{id}:
 *   get:
 *     summary: Get module by ID
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Module found
 *       404:
 *         description: Not found
 */
router.get('/:id', optionalAuthenticate, [param('id').isMongoId()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const mod = await Module.findById(req.params.id);
    if (!mod) {
      return res.status(404).json({ success: false, message: 'Module not found' });
    }

    const access = await canAccessCourseContent(req.user || null, mod.course);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const isStaff =
      req.user &&
      (req.user.role === 'admin' ||
        (req.user.role === 'instructor' &&
          access.course.instructor.toString() === req.user._id.toString()));

    if (!mod.isPublished && !isStaff) {
      return res.status(403).json({ success: false, message: 'Module not available' });
    }

    res.status(200).json({ success: true, data: mod });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/modules:
 *   post:
 *     summary: Create a module
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  authenticate,
  authorize('instructor', 'admin'),
  [
    body('course').isMongoId(),
    body('title').trim().notEmpty().isLength({ max: 150 }),
    body('order').isInt({ min: 1 }),
    body('description').optional().isString(),
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

      const mod = await Module.create(req.body);
      logger.info(`Module created: ${mod._id} for course ${req.body.course}`);
      res.status(201).json({ success: true, message: 'Module created', data: mod });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/modules/{id}:
 *   put:
 *     summary: Update a module
 *     tags: [Modules]
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
    body('order').optional().isInt({ min: 1 }),
    body('isPublished').optional().isBoolean()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }

      const mod = await Module.findById(req.params.id);
      if (!mod) {
        return res.status(404).json({ success: false, message: 'Module not found' });
      }

      const staff = await ensureCourseStaff(req.user, mod.course);
      if (!staff.ok) {
        return res.status(staff.status).json({ success: false, message: staff.message });
      }

      Object.assign(mod, req.body);
      await mod.save();
      res.status(200).json({ success: true, message: 'Module updated', data: mod });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/v1/modules/{id}:
 *   delete:
 *     summary: Delete a module
 *     tags: [Modules]
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

      const mod = await Module.findById(req.params.id);
      if (!mod) {
        return res.status(404).json({ success: false, message: 'Module not found' });
      }

      const staff = await ensureCourseStaff(req.user, mod.course);
      if (!staff.ok) {
        return res.status(staff.status).json({ success: false, message: staff.message });
      }

      const Lesson = require('../models/Lesson');
      const hasLessons = await Lesson.exists({ module: mod._id });
      if (hasLessons) {
        return res.status(400).json({
          success: false,
          message: 'Delete or reassign lessons in this module first'
        });
      }

      await mod.deleteOne();
      res.status(200).json({ success: true, message: 'Module deleted' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
