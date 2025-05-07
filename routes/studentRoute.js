const express = require('express');
const {
  enrollInCourse,
  getEnrolledCourses,
  getCourseSessions,
  completeSession,
  completeCourse,
  getStudentProfile,
  getAllCourses,
  getCourseProgress
} = require('../controller/studentController');
const authenticate = require('../middleware/authmiddleware');
const{ isStudent} = require('../middleware/rolemiddleware');
const {authorize} = require('../middleware/rolemiddleware')
const router = express.Router();


// Enroll in a course
router.post('/enroll/:courseId',authenticate,isStudent, enrollInCourse);

// Get all enrolled courses
router.get('/my-enrollcourse',authenticate,authorize('STUDENT'), getEnrolledCourses);

router.get('/getcourse',authenticate,getAllCourses);

// View sessions of a specific course
router.get('/course/:courseId/sessions',authenticate,isStudent, getCourseSessions);

//  Mark a session as completed
 router.patch('/session/:sessionId/complete',authenticate,isStudent,completeSession);

//used to ge the profile of the user
router.get('/profile',authenticate,isStudent,getStudentProfile);

router.post('/complete-course',authenticate,isStudent,completeCourse);
// View course progress
router.get('/progress/:courseId',authenticate,isStudent, getCourseProgress);

module.exports = router;
