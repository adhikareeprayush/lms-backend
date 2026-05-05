const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Enrollment:
 *       type: object
 *       required:
 *         - student
 *         - course
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the enrollment
 *         student:
 *           type: string
 *           description: ID of the enrolled student
 *         course:
 *           type: string
 *           description: ID of the course
 *         enrolledAt:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [active, completed, dropped, suspended]
 *         progress:
 *           type: object
 *           properties:
 *             completedLessons:
 *               type: array
 *               items:
 *                 type: string
 *             percentage:
 *               type: number
 *         completedAt:
 *           type: string
 *           format: date-time
 */

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required']
    },
    course: {
      type: mongoose.Schema.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required']
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'completed', 'dropped', 'suspended'],
        message: 'Status must be active, completed, dropped, or suspended'
      },
      default: 'active'
    },
    progress: {
      completedLessons: [
        {
          lesson: {
            type: mongoose.Schema.ObjectId,
            ref: 'Lesson'
          },
          completedAt: {
            type: Date,
            default: Date.now
          }
        }
      ],
      completedQuizzes: [
        {
          quiz: {
            type: mongoose.Schema.ObjectId,
            ref: 'Quiz'
          },
          score: {
            type: Number,
            min: 0,
            max: 100
          },
          completedAt: {
            type: Date,
            default: Date.now
          }
        }
      ],
      completedAssignments: [
        {
          assignment: {
            type: mongoose.Schema.ObjectId,
            ref: 'Assignment'
          },
          grade: {
            type: Number,
            min: 0,
            max: 100
          },
          completedAt: {
            type: Date,
            default: Date.now
          }
        }
      ],
      percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      timeSpent: {
        type: Number, // in minutes
        default: 0
      },
      lastAccessed: {
        type: Date,
        default: Date.now
      }
    },
    completedAt: {
      type: Date
    },
    certificateIssued: {
      type: Boolean,
      default: false
    },
    certificateUrl: {
      type: String
    },
    paymentDetails: {
      amount: {
        type: Number,
        min: 0
      },
      currency: {
        type: String,
        default: 'USD'
      },
      paymentMethod: {
        type: String
      },
      transactionId: {
        type: String
      },
      paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
      },
      paidAt: {
        type: Date
      }
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot be more than 500 characters']
    }
  },
  {
    timestamps: true
  }
);

// Compound index to ensure unique enrollment per student per course
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

// Indexes for better query performance
enrollmentSchema.index({ student: 1 });
enrollmentSchema.index({ course: 1 });
enrollmentSchema.index({ status: 1 });
enrollmentSchema.index({ enrolledAt: -1 });
enrollmentSchema.index({ 'progress.percentage': -1 });

// Pre-save middleware to update completion status
enrollmentSchema.pre('save', function (next) {
  if (this.progress.percentage >= 100 && this.status === 'active') {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  next();
});

// Instance method to calculate progress
enrollmentSchema.methods.calculateProgress = async function () {
  const Lesson = mongoose.model('Lesson');
  const Quiz = mongoose.model('Quiz');
  const Assignment = mongoose.model('Assignment');

  // Get total course content
  const lessons = await Lesson.find({ course: this.course });
  const quizzes = await Quiz.find({ course: this.course });
  const assignments = await Assignment.find({ course: this.course });

  const totalItems = lessons.length + quizzes.length + assignments.length;

  if (totalItems === 0) {
    this.progress.percentage = 0;
    return;
  }

  const completedItems =
    this.progress.completedLessons.length +
    this.progress.completedQuizzes.length +
    this.progress.completedAssignments.length;

  this.progress.percentage = Math.round((completedItems / totalItems) * 100);
  this.progress.lastAccessed = new Date();

  await this.save();
};

// Instance method to mark lesson as completed
enrollmentSchema.methods.markLessonCompleted = async function (lessonId) {
  const existingLesson = this.progress.completedLessons.find(
    (lesson) => lesson.lesson.toString() === lessonId.toString()
  );

  if (!existingLesson) {
    this.progress.completedLessons.push({
      lesson: lessonId,
      completedAt: new Date()
    });
    await this.calculateProgress();
  }
};

// Instance method to mark quiz as completed
enrollmentSchema.methods.markQuizCompleted = async function (quizId, score) {
  const existingQuiz = this.progress.completedQuizzes.find(
    (quiz) => quiz.quiz.toString() === quizId.toString()
  );

  if (existingQuiz) {
    // Update score if it's better
    if (score > existingQuiz.score) {
      existingQuiz.score = score;
      existingQuiz.completedAt = new Date();
    }
  } else {
    this.progress.completedQuizzes.push({
      quiz: quizId,
      score: score,
      completedAt: new Date()
    });
  }

  await this.calculateProgress();
};

// Instance method to mark assignment as completed
enrollmentSchema.methods.markAssignmentCompleted = async function (assignmentId, grade) {
  const existingAssignment = this.progress.completedAssignments.find(
    (assignment) => assignment.assignment.toString() === assignmentId.toString()
  );

  if (existingAssignment) {
    existingAssignment.grade = grade;
    existingAssignment.completedAt = new Date();
  } else {
    this.progress.completedAssignments.push({
      assignment: assignmentId,
      grade: grade,
      completedAt: new Date()
    });
  }

  await this.calculateProgress();
};

// Static method to get enrollment statistics
enrollmentSchema.statics.getEnrollmentStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  return stats;
};

module.exports = mongoose.model('Enrollment', enrollmentSchema);
