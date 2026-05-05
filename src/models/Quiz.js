const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     QuizQuestion:
 *       type: object
 *       properties:
 *         questionText:
 *           type: string
 *         type:
 *           type: string
 *           enum: [multiple_choice, true_false, short_answer]
 *         options:
 *           type: array
 *           items:
 *             type: string
 *         correctAnswer:
 *           description: Index for MCQ, boolean for true/false, string for short answer
 *         points:
 *           type: number
 *     Quiz:
 *       type: object
 *       required:
 *         - title
 *         - course
 *         - questions
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         course:
 *           type: string
 *         timeLimitMinutes:
 *           type: integer
 *         passingScore:
 *           type: number
 *         questions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/QuizQuestion'
 */

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
      maxlength: [2000, 'Question text is too long']
    },
    type: {
      type: String,
      enum: ['multiple_choice', 'true_false', 'short_answer'],
      required: true
    },
    options: [String],
    correctAnswer: mongoose.Schema.Types.Mixed,
    points: {
      type: Number,
      default: 1,
      min: 0
    }
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.ObjectId,
      ref: 'Course',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      maxlength: [3000, 'Description cannot exceed 3000 characters']
    },
    timeLimitMinutes: {
      type: Number,
      min: 1
    },
    passingScore: {
      type: Number,
      default: 70,
      min: 0,
      max: 100
    },
    questions: {
      type: [questionSchema],
      validate: [(val) => val.length > 0, 'Quiz must have at least one question']
    },
    isPublished: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

quizSchema.index({ course: 1 });

module.exports = mongoose.model('Quiz', quizSchema);
