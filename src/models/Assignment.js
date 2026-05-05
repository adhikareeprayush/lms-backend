const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Assignment:
 *       type: object
 *       required:
 *         - title
 *         - course
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         instructions:
 *           type: string
 *         course:
 *           type: string
 *         module:
 *           type: string
 *         dueDate:
 *           type: string
 *           format: date-time
 *         maxPoints:
 *           type: number
 *         isPublished:
 *           type: boolean
 */

const assignmentSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.ObjectId,
      ref: 'Course',
      required: true
    },
    module: {
      type: mongoose.Schema.ObjectId,
      ref: 'Module'
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    instructions: {
      type: String,
      maxlength: [10000, 'Instructions cannot exceed 10000 characters']
    },
    dueDate: {
      type: Date
    },
    maxPoints: {
      type: Number,
      default: 100,
      min: [1, 'maxPoints must be at least 1']
    },
    attachments: [
      {
        title: String,
        url: { type: String, required: true }
      }
    ],
    isPublished: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

assignmentSchema.index({ course: 1 });
assignmentSchema.index({ module: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
