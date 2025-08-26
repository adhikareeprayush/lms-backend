const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Course:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - instructor
 *         - category
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the course
 *         title:
 *           type: string
 *           description: Title of the course
 *         description:
 *           type: string
 *           description: Description of the course
 *         shortDescription:
 *           type: string
 *           description: Short description for course cards
 *         instructor:
 *           type: string
 *           description: ID of the instructor
 *         category:
 *           type: string
 *           description: Course category
 *         level:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *         price:
 *           type: number
 *           description: Course price (0 for free courses)
 *         duration:
 *           type: number
 *           description: Course duration in hours
 *         thumbnail:
 *           type: string
 *           description: Course thumbnail image URL
 *         isPublished:
 *           type: boolean
 *           description: Whether the course is published
 *         enrollmentCount:
 *           type: number
 *           description: Number of students enrolled
 *         rating:
 *           type: object
 *           properties:
 *             average:
 *               type: number
 *             count:
 *               type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters']
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true
    },
    description: {
      type: String,
      required: [true, 'Course description is required'],
      maxlength: [2000, 'Description cannot be more than 2000 characters']
    },
    shortDescription: {
      type: String,
      required: [true, 'Short description is required'],
      maxlength: [200, 'Short description cannot be more than 200 characters']
    },
    instructor: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Course must have an instructor']
    },
    category: {
      type: String,
      required: [true, 'Course category is required'],
      enum: {
        values: [
          'programming',
          'web-development',
          'mobile-development',
          'data-science',
          'machine-learning',
          'artificial-intelligence',
          'cybersecurity',
          'cloud-computing',
          'devops',
          'design',
          'business',
          'marketing',
          'finance',
          'language',
          'music',
          'art',
          'photography',
          'health-fitness',
          'cooking',
          'lifestyle',
          'academic',
          'test-prep',
          'other'
        ],
        message: 'Please select a valid category'
      }
    },
    subcategory: {
      type: String,
      trim: true
    },
    level: {
      type: String,
      required: [true, 'Course level is required'],
      enum: {
        values: ['beginner', 'intermediate', 'advanced'],
        message: 'Level must be beginner, intermediate, or advanced'
      }
    },
    price: {
      type: Number,
      required: [true, 'Course price is required'],
      min: [0, 'Price cannot be negative'],
      default: 0
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true
    },
    discountPrice: {
      type: Number,
      min: [0, 'Discount price cannot be negative']
    },
    duration: {
      type: Number, // Duration in hours
      required: [true, 'Course duration is required'],
      min: [0.5, 'Duration must be at least 0.5 hours']
    },
    thumbnail: {
      type: String,
      default: ''
    },
    previewVideo: {
      type: String,
      default: ''
    },
    images: [
      {
        type: String
      }
    ],
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true
      }
    ],
    prerequisites: [
      {
        type: String,
        trim: true
      }
    ],
    learningObjectives: [
      {
        type: String,
        required: [true, 'At least one learning objective is required'],
        trim: true
      }
    ],
    targetAudience: [
      {
        type: String,
        trim: true
      }
    ],
    requirements: [
      {
        type: String,
        trim: true
      }
    ],
    syllabus: [
      {
        title: {
          type: String,
          required: true,
          trim: true
        },
        description: {
          type: String,
          trim: true
        },
        estimatedTime: {
          type: Number, // in minutes
          min: 0
        }
      }
    ],
    isPublished: {
      type: Boolean,
      default: false
    },
    publishedAt: {
      type: Date
    },
    enrollmentCount: {
      type: Number,
      default: 0,
      min: 0
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      count: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    reviews: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Review'
      }
    ],
    language: {
      type: String,
      default: 'English'
    },
    subtitles: [
      {
        language: String,
        file: String
      }
    ],
    certificate: {
      enabled: {
        type: Boolean,
        default: true
      },
      template: {
        type: String,
        default: 'default'
      }
    },
    settings: {
      allowComments: {
        type: Boolean,
        default: true
      },
      allowReviews: {
        type: Boolean,
        default: true
      },
      autoEnroll: {
        type: Boolean,
        default: false
      },
      maxStudents: {
        type: Number,
        min: 1
      }
    },
    stats: {
      totalLessons: {
        type: Number,
        default: 0
      },
      totalQuizzes: {
        type: Number,
        default: 0
      },
      totalAssignments: {
        type: Number,
        default: 0
      },
      averageCompletionTime: {
        type: Number, // in hours
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

// Virtual for modules
courseSchema.virtual('modules', {
  ref: 'Module',
  localField: '_id',
  foreignField: 'course',
  justOne: false
});

// Virtual for enrollments
courseSchema.virtual('enrollments', {
  ref: 'Enrollment',
  localField: '_id',
  foreignField: 'course',
  justOne: false
});

// Indexes for better query performance
courseSchema.index({ category: 1 });
courseSchema.index({ level: 1 });
courseSchema.index({ price: 1 });
courseSchema.index({ isPublished: 1 });
courseSchema.index({ 'rating.average': -1 });
courseSchema.index({ enrollmentCount: -1 });
courseSchema.index({ createdAt: -1 });
courseSchema.index({ instructor: 1 });

// Text index for search
courseSchema.index({
  title: 'text',
  description: 'text',
  shortDescription: 'text',
  tags: 'text'
});

// Pre-save middleware to generate slug
courseSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Add timestamp to ensure uniqueness
    this.slug += '-' + Date.now();
  }
  next();
});

// Pre-save middleware to set publishedAt
courseSchema.pre('save', function (next) {
  if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Static method to get course statistics
courseSchema.statics.getCourseStats = async function () {
  const stats = await this.aggregate([
    {
      $match: { isPublished: true }
    },
    {
      $group: {
        _id: null,
        totalCourses: { $sum: 1 },
        totalEnrollments: { $sum: '$enrollmentCount' },
        averagePrice: { $avg: '$price' },
        averageRating: { $avg: '$rating.average' }
      }
    }
  ]);

  return (
    stats[0] || {
      totalCourses: 0,
      totalEnrollments: 0,
      averagePrice: 0,
      averageRating: 0
    }
  );
};

// Static method to get courses by category
courseSchema.statics.getCoursesByCategory = async function () {
  const stats = await this.aggregate([
    {
      $match: { isPublished: true }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        averagePrice: { $avg: '$price' },
        averageRating: { $avg: '$rating.average' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  return stats;
};

// Instance method to update rating
courseSchema.methods.updateRating = async function () {
  const Review = mongoose.model('Review');
  const reviews = await Review.find({ course: this._id });

  if (reviews.length === 0) {
    this.rating.average = 0;
    this.rating.count = 0;
  } else {
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    this.rating.average = totalRating / reviews.length;
    this.rating.count = reviews.length;
  }

  await this.save();
};

// Instance method to update enrollment count
courseSchema.methods.updateEnrollmentCount = async function () {
  const Enrollment = mongoose.model('Enrollment');
  const count = await Enrollment.countDocuments({
    course: this._id,
    status: 'active'
  });

  this.enrollmentCount = count;
  await this.save();
};

module.exports = mongoose.model('Course', courseSchema);
