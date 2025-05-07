const prisma = require('../DB/db.config');

const createCourse = async (req, res) => {
  const { title, description, category, sessions } = req.body;
  const instructorId = req.user.userId;
  try {
    const course = await prisma.course.create({
      data: {
        title,
        description,
        category,
        instructorId,
        sessions: {
          create: sessions.map(s => ({
            title: s.title,
            videoUrl: s.videoUrl,
            content: s.content
          }))
        }
      },
      include: { sessions: true }
    });
    res.status(201).json(course);
  } catch (error) {
    console.error(error);  
    res.status(500).json({ error: error.message || 'An error occurred while creating the course' });
  }
};

const getAllCourses = async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: { sessions: true, instructor: true },
    });
    res.status(200).json(courses);
  } catch (error) {
    console.error(error);  
    res.status(500).json({ error: error.message || 'An error occurred while fetching courses' });
  }
};
// Fetch all courses created by the logged-in instructor
const getInstructorCourses = async (req, res) => {
  const instructorId = req.user.userId;

  try {
    const courses = await prisma.course.findMany({
      where: {
        instructorId: instructorId, // Fetch only courses created by this instructor
      },
      include: {
        sessions: true, 
        enrollments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (courses.length === 0) {
      return res.status(404).json({ message: "No courses found for this instructor" });
    }

    res.status(200).json(courses);
  } catch (err) {
    console.error("Error in getInstructorCourses:", err);
    res.status(500).json({ message: "Failed to fetch instructor courses" });
  }
};

// const getCourseById = async (req, res) => {
//   try {
//     const course = await prisma.course.findUnique({
//       where: { id: Number(req.params.id) },
//       include: { sessions: true },
//     });
//     if (!course) {
//       return res.status(404).json({ message: 'Course not found' });
//     }
//     res.status(200).json(course);
//   } catch (error) {
//     console.error(error); 
//     res.status(500).json({ error: error.message || 'An error occurred while fetching the course' });
//   }
// };
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params; 
    const courseId = parseInt(id); 

    if (isNaN(courseId)) {
      return res.status(400).json({ message: "Invalid course id" });
    }

    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
      include: {
        sessions: true,
      },
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// const updateCourse = async (req, res) => {
//   const { id } = req.params;
//   const { title, description, category, sessions } = req.body;
//   try {
//     const course = await prisma.course.update({
//       where: { id: Number(id) },
//       data: {
//         title,
//         description,
//         category,
//         sessions: {
//           deleteMany: {}, 
//           create: sessions.map(s => ({
//             title: s.title,
//             videoUrl: s.videoUrl,
//             content: s.content
//           })),
//         },
//       },
//       include: { sessions: true },
//     });
//     res.status(200).json(course);
//   } catch (error) {
//     console.error(error); 
//     res.status(500).json({ error: error.message || 'An error occurred while updating the course' });
//   }
// };
const updateCourse = async (req, res) => {
  const { id } = req.params;
  const { title, description, category, sessions } = req.body;
  
  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Title, description, and category are required.' });
  }

  // Validate sessions field
  if (!Array.isArray(sessions)) {
    return res.status(400).json({ error: 'Sessions must be an array.' });
  }

  try {
    const course = await prisma.course.update({
      where: { id: Number(id) },
      data: {
        title,
        description,
        category,
        sessions: {
          deleteMany: {},
          create: sessions.map(s => ({
            title: s.title,
            videoUrl: s.videoUrl,
            content: s.content,
          })),
        },
      },
      include: { sessions: true },
    });
    res.status(200).json(course);
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ error: error.message || 'An error occurred while updating the course' });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const courseId = Number(req.params.id);

    // Delete all dependent records (Enrollment, session)
    await prisma.enrollment.deleteMany({ where: { courseId: courseId } });  
    await prisma.session.deleteMany({ where: { courseId: courseId } });    

    await prisma.course.delete({ where: { id: courseId } });

    res.status(204).send("Course deleted successfully");

  } catch (error) {
    console.error(error);  

    // Handle foreign key constraint violation error
    if (error.code === 'P2003') {
      res.status(400).json({ error: "Foreign key constraint violation. Please ensure related records are deleted first." });
    } else {
      res.status(500).json({ error: error.message || 'An error occurred while deleting the course' });
    }
  }
};


const createReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const { courseId } = req.params;
    const studentId = req.user.userId;

    // Check if already reviewed
    const exists = await prisma.review.findFirst({
      where: { courseId: parseInt(courseId), studentId }
    });

    if (exists) {
      return res.status(400).json({ error: "Review already exists" });
    }

    const review = await prisma.review.create({
      data: {
        courseId: parseInt(courseId),
        studentId,
        rating,
        comment
      }
    });

    res.status(201).json({
      message: "Review created successfully",
      review
    });

  } catch (error) {
    console.error("Review creation failed:", error);
    res.status(500).json({ message: "something went wrong", error: error.message });
  }
};


const getCourseReviews = async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);

    if (isNaN(courseId)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    const reviews = await prisma.review.findMany({
      where: { courseId },
      include: {
        student: { select: { name: true } },
        comments: {
          include: {
            user: { select: { name: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(reviews);
  } catch (error) {
    console.error("Error fetching course reviews:", error);
    res.status(500).json({ error: error.message || 'An error occurred while fetching course reviews' });
  }
};



const addComment = async (req, res) => {
  const { reviewId } = req.params;
  const { text } = req.body;
  const userId = req.user?.userId; 

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: Missing user' });
  }

  try {
    const comment = await prisma.reviewComment.create({
      data: {
        reviewId: parseInt(reviewId), 
        userId,
        text
      }
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating comment', error });
  }
};


// const deleteReview = async (req, res) => {
//   const id = parseInt(req.params.id);
//   const userId = req.user.userId;

//   const review = await prisma.review.findUnique({ where: { id } });
//   console.log("Fetched review:", review);
// console.log("Logged in user ID:", userId);
//   if (!review || review.studentId !== userId)
//     return res.status(403).json({ error: "Unauthorized" });

//   await prisma.review.delete({ where: { id } });

//   res.json({ message: "Review deleted" });
// };

module.exports = { createCourse, getAllCourses, getCourseById, updateCourse, 
  deleteCourse,getInstructorCourses,createReview,getCourseReviews,addComment};
