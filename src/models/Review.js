const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       required:
 *         - course
 *         - student
 *         - rating
 *       properties:
 *         _id:
 *           type: string
 *         course:
 *           type: string
 *         student:
 *           type: string
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         comment:
 *           type: string
 */

const reviewSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.ObjectId,
      ref: 'Course',
      required: true
    },
    student: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: [2000, 'Comment is too long']
    }
  },
  { timestamps: true }
);

reviewSchema.index({ course: 1, student: 1 }, { unique: true });

reviewSchema.post('save', async function () {
  const Course = mongoose.model('Course');
  const course = await Course.findById(this.course);
  if (course && typeof course.updateRating === 'function') {
    await course.updateRating();
  }
});

module.exports = mongoose.model('Review', reviewSchema);
