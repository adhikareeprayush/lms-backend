const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB Connected for seeding');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

// Sample data
const sampleUsers = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@lms.com',
    password: 'Admin123!',
    role: 'admin',
    isEmailVerified: true,
    bio: 'System administrator with full access to manage the platform.'
  },
  {
    firstName: 'John',
    lastName: 'Instructor',
    email: 'instructor@lms.com',
    password: 'Instructor123!',
    role: 'instructor',
    isEmailVerified: true,
    bio: 'Experienced software developer and educator with 10+ years in the industry.',
    socialLinks: {
      linkedin: 'https://linkedin.com/in/john-instructor',
      github: 'https://github.com/john-instructor'
    }
  },
  {
    firstName: 'Jane',
    lastName: 'Student',
    email: 'student@lms.com',
    password: 'Student123!',
    role: 'student',
    isEmailVerified: true,
    bio: 'Passionate learner interested in web development and programming.',
    preferences: {
      notifications: {
        email: true,
        push: true
      },
      language: 'en',
      timezone: 'UTC'
    }
  },
  {
    firstName: 'Alice',
    lastName: 'Developer',
    email: 'alice@lms.com',
    password: 'Alice123!',
    role: 'instructor',
    isEmailVerified: true,
    bio: 'Full-stack developer specializing in modern web technologies.',
    socialLinks: {
      website: 'https://alice-dev.com',
      twitter: 'https://twitter.com/alice_dev'
    }
  },
  {
    firstName: 'Bob',
    lastName: 'Learner',
    email: 'bob@lms.com',
    password: 'Bob123!',
    role: 'student',
    isEmailVerified: true,
    bio: 'Computer science student eager to learn new technologies.'
  }
];

const sampleCourses = [
  {
    title: 'Complete JavaScript Fundamentals',
    slug: 'complete-javascript-fundamentals',
    description:
      'Master JavaScript from basics to advanced concepts. This comprehensive course covers variables, functions, objects, arrays, ES6+ features, asynchronous programming, and modern JavaScript development practices. Perfect for beginners and intermediate developers.',
    shortDescription:
      'Learn JavaScript from scratch to advanced level with hands-on projects and real-world examples.',
    category: 'programming',
    subcategory: 'javascript',
    level: 'beginner',
    price: 99.99,
    currency: 'USD',
    duration: 40,
    thumbnail: 'https://example.com/js-course-thumbnail.jpg',
    tags: ['javascript', 'programming', 'web-development', 'es6', 'beginner'],
    prerequisites: ['Basic computer knowledge', 'Understanding of HTML/CSS basics'],
    learningObjectives: [
      'Understand JavaScript syntax and fundamentals',
      'Work with variables, functions, and objects',
      'Master ES6+ features and modern JavaScript',
      'Build interactive web applications',
      'Understand asynchronous programming concepts'
    ],
    targetAudience: [
      'Beginners new to programming',
      'Web developers wanting to strengthen JavaScript skills',
      'Students learning web development'
    ],
    requirements: [
      'A computer with internet connection',
      'Basic understanding of HTML and CSS',
      'Text editor or IDE (VS Code recommended)'
    ],
    syllabus: [
      {
        title: 'JavaScript Basics',
        description: 'Variables, data types, and basic operations',
        estimatedTime: 180
      },
      {
        title: 'Functions and Scope',
        description: 'Function declarations, expressions, and scope concepts',
        estimatedTime: 240
      },
      {
        title: 'Objects and Arrays',
        description: 'Working with complex data structures',
        estimatedTime: 200
      },
      {
        title: 'ES6+ Features',
        description: 'Modern JavaScript features and syntax',
        estimatedTime: 300
      },
      {
        title: 'Asynchronous JavaScript',
        description: 'Promises, async/await, and API calls',
        estimatedTime: 280
      }
    ],
    isPublished: true,
    publishedAt: new Date('2024-01-15'),
    language: 'English',
    certificate: {
      enabled: true,
      template: 'default'
    },
    settings: {
      allowComments: true,
      allowReviews: true,
      autoEnroll: false,
      maxStudents: 500
    },
    stats: {
      totalLessons: 25,
      totalQuizzes: 5,
      totalAssignments: 3
    }
  },
  {
    title: 'React Development Masterclass',
    slug: 'react-development-masterclass',
    description:
      'Build modern, scalable web applications with React. Learn components, hooks, state management, routing, and best practices. Includes hands-on projects and real-world application development.',
    shortDescription:
      'Master React development with modern hooks, state management, and best practices.',
    category: 'web-development',
    subcategory: 'react',
    level: 'intermediate',
    price: 149.99,
    currency: 'USD',
    duration: 60,
    thumbnail: 'https://example.com/react-course-thumbnail.jpg',
    tags: ['react', 'javascript', 'web-development', 'hooks', 'intermediate'],
    prerequisites: [
      'Strong JavaScript knowledge',
      'HTML/CSS proficiency',
      'Basic understanding of ES6+'
    ],
    learningObjectives: [
      'Build complex React applications',
      'Master React hooks and state management',
      'Implement routing and navigation',
      'Optimize React application performance',
      'Deploy React applications to production'
    ],
    targetAudience: [
      'JavaScript developers wanting to learn React',
      'Frontend developers seeking to improve React skills',
      'Developers building modern web applications'
    ],
    requirements: [
      'Strong JavaScript fundamentals',
      'Node.js installed on your computer',
      'Code editor (VS Code recommended)',
      'Basic command line knowledge'
    ],
    syllabus: [
      {
        title: 'React Fundamentals',
        description: 'Components, JSX, and React basics',
        estimatedTime: 240
      },
      {
        title: 'Hooks and State Management',
        description: 'useState, useEffect, and custom hooks',
        estimatedTime: 300
      },
      {
        title: 'Routing and Navigation',
        description: 'React Router and navigation patterns',
        estimatedTime: 180
      },
      {
        title: 'Advanced Patterns',
        description: 'Context API, performance optimization',
        estimatedTime: 240
      }
    ],
    isPublished: true,
    publishedAt: new Date('2024-02-01'),
    language: 'English'
  },
  {
    title: 'Introduction to Data Science with Python',
    slug: 'intro-data-science-python',
    description:
      'Dive into the world of data science using Python. Learn data manipulation with pandas, visualization with matplotlib and seaborn, and basic machine learning concepts. Perfect for beginners in data science.',
    shortDescription:
      'Start your data science journey with Python, pandas, and machine learning basics.',
    category: 'data-science',
    subcategory: 'python',
    level: 'beginner',
    price: 79.99,
    currency: 'USD',
    duration: 35,
    thumbnail: 'https://example.com/data-science-course-thumbnail.jpg',
    tags: ['python', 'data-science', 'pandas', 'machine-learning', 'beginner'],
    prerequisites: ['Basic Python knowledge', 'High school mathematics'],
    learningObjectives: [
      'Manipulate data using pandas',
      'Create visualizations with matplotlib and seaborn',
      'Understand basic statistics and data analysis',
      'Build simple machine learning models',
      'Work with real datasets'
    ],
    isPublished: true,
    publishedAt: new Date('2024-01-20'),
    language: 'English'
  },
  {
    title: 'Advanced Node.js Backend Development',
    slug: 'advanced-nodejs-backend',
    description:
      'Build scalable backend applications with Node.js. Cover Express.js, database integration, authentication, API design, testing, and deployment strategies for production-ready applications.',
    shortDescription:
      'Master backend development with Node.js, Express, databases, and production deployment.',
    category: 'web-development',
    subcategory: 'nodejs',
    level: 'advanced',
    price: 199.99,
    currency: 'USD',
    duration: 80,
    thumbnail: 'https://example.com/nodejs-course-thumbnail.jpg',
    tags: ['nodejs', 'express', 'backend', 'api', 'advanced'],
    prerequisites: ['Strong JavaScript knowledge', 'Basic Node.js experience', 'Database concepts'],
    learningObjectives: [
      'Build scalable REST APIs',
      'Implement authentication and authorization',
      'Work with databases and ORMs',
      'Test and debug Node.js applications',
      'Deploy applications to production'
    ],
    isPublished: true,
    publishedAt: new Date('2024-02-10'),
    language: 'English'
  },
  {
    title: 'UI/UX Design Fundamentals',
    slug: 'ui-ux-design-fundamentals',
    description:
      'Learn the principles of user interface and user experience design. Cover design thinking, wireframing, prototyping, color theory, typography, and user research methodologies.',
    shortDescription:
      'Master UI/UX design principles and create user-centered digital experiences.',
    category: 'design',
    subcategory: 'ui-ux',
    level: 'beginner',
    price: 89.99,
    currency: 'USD',
    duration: 30,
    thumbnail: 'https://example.com/uiux-course-thumbnail.jpg',
    tags: ['design', 'ui', 'ux', 'figma', 'wireframing'],
    prerequisites: ['Basic computer skills', 'Interest in design'],
    learningObjectives: [
      'Understand design thinking principles',
      'Create wireframes and prototypes',
      'Apply color theory and typography',
      'Conduct user research',
      'Design responsive interfaces'
    ],
    isPublished: false, // Draft course
    language: 'English'
  }
];

// Clear existing data and seed new data
const seedData = async () => {
  try {
    console.log('🗑️  Clearing existing data...');

    // Clear existing data
    await User.deleteMany({});
    await Course.deleteMany({});
    await Enrollment.deleteMany({});

    console.log('👥 Creating users...');

    // Create users
    const createdUsers = await User.create(sampleUsers);
    console.log(`✅ Created ${createdUsers.length} users`);

    // Find instructor users for course assignment
    const instructors = createdUsers.filter((user) => user.role === 'instructor');
    const students = createdUsers.filter((user) => user.role === 'student');

    console.log('📚 Creating courses...');

    // Assign instructors to courses
    const coursesWithInstructors = sampleCourses.map((course, index) => ({
      ...course,
      instructor: instructors[index % instructors.length]._id
    }));

    const createdCourses = await Course.create(coursesWithInstructors);
    console.log(`✅ Created ${createdCourses.length} courses`);

    console.log('📝 Creating sample enrollments...');

    // Create sample enrollments
    const enrollments = [];
    const publishedCourses = createdCourses.filter((course) => course.isPublished);

    // Enroll students in some courses
    for (const student of students) {
      // Enroll each student in 2-3 random published courses
      const coursesToEnroll = publishedCourses
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 3) + 1);

      for (const course of coursesToEnroll) {
        enrollments.push({
          student: student._id,
          course: course._id,
          enrolledAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
          status: 'active',
          progress: {
            percentage: Math.floor(Math.random() * 100),
            timeSpent: Math.floor(Math.random() * 1000) + 100,
            lastAccessed: new Date()
          },
          paymentDetails: {
            amount: course.price,
            currency: course.currency,
            paymentStatus: 'completed',
            paidAt: new Date()
          }
        });
      }
    }

    if (enrollments.length > 0) {
      await Enrollment.create(enrollments);
      console.log(`✅ Created ${enrollments.length} enrollments`);

      // Update course enrollment counts
      for (const course of publishedCourses) {
        await course.updateEnrollmentCount();
      }
    }

    console.log('\n🎉 Seed data created successfully!');
    console.log('\n📋 Sample Login Credentials:');
    console.log('Admin: admin@lms.com / Admin123!');
    console.log('Instructor: instructor@lms.com / Instructor123!');
    console.log('Student: student@lms.com / Student123!');
    console.log('\n🚀 You can now start the server with: npm run dev');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the seed function
const runSeed = async () => {
  await connectDB();
  await seedData();
};

// Check if running directly
if (require.main === module) {
  runSeed();
}

module.exports = { seedData, sampleUsers, sampleCourses };
