const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Lesson:
 *       type: object
 *       required:
 *         - title
 *         - course
 *         - module
 *         - type
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the lesson
 *         title:
 *           type: string
 *           description: Title of the lesson
 *         description:
 *           type: string
 *           description: Description of the lesson
 *         course:
 *           type: string
 *           description: ID of the course this lesson belongs to
 *         module:
 *           type: string
 *           description: ID of the module this lesson belongs to
 *         type:
 *           type: string
 *           enum: [video, text, document, audio, interactive]
 *         content:
 *           type: object
 *           description: Lesson content based on type
 *         duration:
 *           type: number
 *           description: Lesson duration in minutes
 *         order:
 *           type: number
 *           description: Order of lesson within module
 *         isPublished:
 *           type: boolean
 *           description: Whether the lesson is published
 */

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters']
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot be more than 1000 characters']
    },
    course: {
      type: mongoose.Schema.ObjectId,
      ref: 'Course',
      required: [true, 'Lesson must belong to a course']
    },
    module: {
      type: mongoose.Schema.ObjectId,
      ref: 'Module',
      required: [true, 'Lesson must belong to a module']
    },
    type: {
      type: String,
      required: [true, 'Lesson type is required'],
      enum: {
        values: ['video', 'text', 'document', 'audio', 'interactive', 'quiz', 'assignment'],
        message: 'Type must be video, text, document, audio, interactive, quiz, or assignment'
      }
    },
    content: {
      // For video lessons
      videoUrl: {
        type: String
      },
      videoDuration: {
        type: Number // in seconds
      },
      videoThumbnail: {
        type: String
      },
      videoSubtitles: [
        {
          language: String,
          file: String
        }
      ],

      // For text lessons
      textContent: {
        type: String
      },

      // For document lessons
      documentUrl: {
        type: String
      },
      documentType: {
        type: String,
        enum: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx']
      },

      // For audio lessons
      audioUrl: {
        type: String
      },
      audioDuration: {
        type: Number // in seconds
      },

      // For interactive content
      interactiveContent: {
        type: mongoose.Schema.Types.Mixed
      },

      // Additional resources
      resources: [
        {
          title: String,
          url: String,
          type: {
            type: String,
            enum: ['link', 'download', 'external']
          }
        }
      ],

      // Code snippets for programming courses
      codeSnippets: [
        {
          language: String,
          code: String,
          explanation: String
        }
      ]
    },
    duration: {
      type: Number, // in minutes
      required: [true, 'Lesson duration is required'],
      min: [1, 'Duration must be at least 1 minute']
    },
    order: {
      type: Number,
      required: [true, 'Lesson order is required'],
      min: [1, 'Order must be at least 1']
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    isPreview: {
      type: Boolean,
      default: false
    },
    isFree: {
      type: Boolean,
      default: false
    },
    prerequisites: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Lesson'
      }
    ],
    learningObjectives: [
      {
        type: String,
        trim: true
      }
    ],
    notes: {
      type: String,
      maxlength: [2000, 'Notes cannot be more than 2000 characters']
    },
    attachments: [
      {
        title: String,
        url: String,
        size: Number, // in bytes
        type: String
      }
    ],
    settings: {
      allowComments: {
        type: Boolean,
        default: true
      },
      allowDownload: {
        type: Boolean,
        default: false
      },
      trackProgress: {
        type: Boolean,
        default: true
      }
    },
    analytics: {
      viewCount: {
        type: Number,
        default: 0
      },
      averageWatchTime: {
        type: Number, // in minutes
        default: 0
      },
      completionRate: {
        type: Number, // percentage
        default: 0
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for comments
lessonSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'lesson',
  justOne: false
});

// Indexes for better query performance
lessonSchema.index({ course: 1 });
lessonSchema.index({ module: 1 });
lessonSchema.index({ order: 1 });
lessonSchema.index({ isPublished: 1 });
lessonSchema.index({ type: 1 });

// Compound index for course and order
lessonSchema.index({ course: 1, order: 1 });
lessonSchema.index({ module: 1, order: 1 });

// Pre-save middleware to ensure unique order within module
lessonSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('order') || this.isModified('module')) {
    const existingLesson = await this.constructor.findOne({
      module: this.module,
      order: this.order,
      _id: { $ne: this._id }
    });

    if (existingLesson) {
      const error = new Error('Lesson order must be unique within the module');
      error.name = 'ValidationError';
      return next(error);
    }
  }
  next();
});

// Instance method to mark as completed for a user
lessonSchema.methods.markAsCompleted = async function (userId) {
  const Enrollment = mongoose.model('Enrollment');

  const enrollment = await Enrollment.findOne({
    student: userId,
    course: this.course
  });

  if (enrollment) {
    await enrollment.markLessonCompleted(this._id);
  }
};

// Instance method to get next lesson
lessonSchema.methods.getNextLesson = async function () {
  return await this.constructor
    .findOne({
      module: this.module,
      order: { $gt: this.order },
      isPublished: true
    })
    .sort({ order: 1 });
};

// Instance method to get previous lesson
lessonSchema.methods.getPreviousLesson = async function () {
  return await this.constructor
    .findOne({
      module: this.module,
      order: { $lt: this.order },
      isPublished: true
    })
    .sort({ order: -1 });
};

// Static method to get lessons by course
lessonSchema.statics.getLessonsByCourse = async function (courseId, isPublished = true) {
  const query = { course: courseId };
  if (isPublished) {
    query.isPublished = true;
  }

  return await this.find(query)
    .populate('module', 'title order')
    .sort({ 'module.order': 1, order: 1 });
};

// Static method to update analytics
lessonSchema.statics.updateAnalytics = async function (lessonId, watchTime, completed = false) {
  const lesson = await this.findById(lessonId);
  if (!lesson) return;

  lesson.analytics.viewCount += 1;

  // Update average watch time
  const totalWatchTime =
    lesson.analytics.averageWatchTime * (lesson.analytics.viewCount - 1) + watchTime;
  lesson.analytics.averageWatchTime = totalWatchTime / lesson.analytics.viewCount;

  // Update completion rate if completed
  if (completed) {
    // This would need more complex logic to track unique completions
    lesson.analytics.completionRate =
      ((lesson.analytics.completionRate + 1) / lesson.analytics.viewCount) * 100;
  }

  await lesson.save();
};

module.exports = mongoose.model('Lesson', lessonSchema);
