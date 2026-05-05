const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Submission:
 *       type: object
 *       required:
 *         - assignment
 *         - student
 *       properties:
 *         _id:
 *           type: string
 *         assignment:
 *           type: string
 *         student:
 *           type: string
 *         textContent:
 *           type: string
 *         fileUrl:
 *           type: string
 *         status:
 *           type: string
 *           enum: [submitted, graded, returned]
 *         grade:
 *           type: number
 *         feedback:
 *           type: string
 */

const submissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.ObjectId,
      ref: 'Assignment',
      required: true
    },
    student: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    textContent: {
      type: String,
      maxlength: [50000, 'Submission text is too long']
    },
    fileUrl: {
      type: String
    },
    status: {
      type: String,
      enum: ['submitted', 'graded', 'returned'],
      default: 'submitted'
    },
    grade: {
      type: Number,
      min: 0
    },
    feedback: {
      type: String,
      maxlength: [5000, 'Feedback is too long']
    },
    gradedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    gradedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });
submissionSchema.index({ student: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
