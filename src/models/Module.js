const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Module:
 *       type: object
 *       required:
 *         - title
 *         - course
 *         - order
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         course:
 *           type: string
 *         order:
 *           type: integer
 *         isPublished:
 *           type: boolean
 */

const moduleSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.ObjectId,
      ref: 'Course',
      required: [true, 'Module must belong to a course']
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    order: {
      type: Number,
      required: true,
      min: [1, 'Order must be at least 1']
    },
    isPublished: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

moduleSchema.index({ course: 1, order: 1 }, { unique: true });
moduleSchema.index({ course: 1 });

module.exports = mongoose.model('Module', moduleSchema);
