const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

/**
 * Instructor of the course or admin.
 */
async function ensureCourseStaff(user, courseId) {
  const course = await Course.findById(courseId);
  if (!course) {
    return { ok: false, status: 404, message: 'Course not found' };
  }
  if (user.role === 'admin') {
    return { ok: true, course };
  }
  if (
    user.role === 'instructor' &&
    course.instructor.toString() === user._id.toString()
  ) {
    return { ok: true, course };
  }
  return { ok: false, status: 403, message: 'Access denied' };
}

/**
 * Resolve course access for catalog / learning content.
 * `user` may be null (anonymous).
 */
async function canAccessCourseContent(user, courseId) {
  const course = await Course.findById(courseId);
  if (!course) {
    return { ok: false, status: 404, message: 'Course not found' };
  }

  if (!user) {
    if (course.isPublished) {
      return { ok: true, course, enrollment: null, visitor: true };
    }
    return { ok: false, status: 403, message: 'Access denied' };
  }

  if (user.role === 'admin') {
    return { ok: true, course, enrollment: null };
  }

  if (
    user.role === 'instructor' &&
    course.instructor.toString() === user._id.toString()
  ) {
    return { ok: true, course, enrollment: null };
  }

  if (user.role === 'student') {
    const enrollment = await Enrollment.findOne({
      student: user._id,
      course: courseId,
      status: 'active'
    });
    if (course.isPublished) {
      return { ok: true, course, enrollment };
    }
    if (enrollment) {
      return { ok: true, course, enrollment };
    }
    return { ok: false, status: 403, message: 'Access denied' };
  }

  return { ok: false, status: 403, message: 'Access denied' };
}

module.exports = {
  ensureCourseStaff,
  canAccessCourseContent
};
