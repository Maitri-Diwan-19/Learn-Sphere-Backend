const express = require('express');
const {createCourse,getAllCourses,updateCourse,deleteCourse, getCourseById,getInstructorCourses, createReview, getCourseReviews, addComment, deleteReview} = require('../controller/courseController');
const authenticate = require('../middleware/authmiddleware');
 const {authorizeInstructor} = require('../middleware/rolemiddleware')
 const {authorize} = require('../middleware/rolemiddleware')
const router = express.Router();
router.post('/:courseId/reviews', authenticate, createReview); 
router.post('/createcourse',authenticate,authorizeInstructor,createCourse);
router.get('/getallcourse',getAllCourses);

router.get('/my-instructor-courses', authenticate, authorizeInstructor, getInstructorCourses);

router.get('/:id',authenticate,getCourseById)
router.put('/:id',authenticate,authorizeInstructor,updateCourse);
router.delete('/:id',authenticate,authorizeInstructor,deleteCourse)

 
router.get('/:courseId/getreviews', getCourseReviews);
// router.delete('/reviews/:id', authenticate,authorize('STUDENT'),deleteReview); 

// Review Comments
router.post('/reviews/:reviewId/comments', authenticate, addComment); 

module.exports =router;


