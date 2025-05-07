const prisma = require('../DB/db.config');

const enrollInCourse = async (req, res) => {
  const studentId = req.user.userId;
  const courseId = Number(req.params.courseId);

  try {
    const existing = await prisma.enrollment.findFirst({
      where: { userId: studentId, courseId }
    });
    if (existing) return res.status(400).json({ message: 'Already enrolled.' });

    await prisma.enrollment.create({ data: { userId: studentId, courseId } });
    res.status(201).json({ message: 'Enrolled successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEnrolledCourses = async (req, res) => {
  try {
    const courses = await prisma.enrollment.findMany({
      where: { userId: req.user.userId },
      include: {
        course: {
          include: { sessions: true }
        }
      }
    });
    res.status(200).json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// const getCourseSessions = async (req, res) => {
//   const studentId = req.user.userId;
//   const courseId = Number(req.params.courseId);
//   console.log(`course id is "${courseId}`);
//   try {
//     const enrollment = await prisma.enrollment.findFirst({ where: { userId: studentId, courseId } });
//     if (!enrollment) return res.status(403).json({ message: 'Not enrolled' });

//     const sessions = await prisma.session.findMany({ where: { courseId } });
//     res.status(200).json(sessions);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
const getCourseSessions = async (req, res) => {
  const studentId = req.user.userId;
  const courseId = Number(req.params.courseId);
  console.log(`course id is ${courseId}`);

  try {
    // Check if the student is enrolled in the course
    const enrollment = await prisma.enrollment.findFirst({ where: { userId: studentId, courseId } });
    console.log('Enrollment:', enrollment);  // Debugging enrollment data
    if (!enrollment) return res.status(403).json({ message: 'Not enrolled' });

    // Fetch sessions for the course
    const sessions = await prisma.session.findMany({ where: { courseId } });

    // If no sessions are found, return a 404
    if (sessions.length === 0) {
      return res.status(404).json({ message: 'No sessions found for this course' });
    }

    // Send the sessions data in the response
    res.status(200).json(sessions);
  } catch (err) {
    console.error('Error:', err);  // Log the full error
    res.status(500).json({ error: err.message });
  }
};

const completeSession = async (req, res) => {
  const studentId = req.user.userId;
  const sessionId = req.params.sessionId;

  try {
    await prisma.sessionProgress.upsert({
      where: {
        userId_sessionId: { userId: studentId, sessionId }
      },
      update: { completed: true },
      create: { userId: studentId, sessionId, completed: true },
    });

    res.status(200).json({ message: 'Session marked as completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCourseProgress = async (req, res) => {
  const studentId = req.user.userId;
  const courseId = Number(req.params.courseId);

  try {
    const total = await prisma.session.count({
      where: {
        courseId: courseId,
      },
    });

    //  Get all completed sessions for the student in this course
    const completedSessions = await prisma.sessionProgress.findMany({
      where: {
        userId: studentId,
        completed: true,
        session: {
          is:{
            courseId: courseId,
          }
         
        },
      },
      select: {
        sessionId: true,
      },
    });

    const completed = completedSessions.length;
    const progress = total > 0 ? parseFloat(((completed / total) * 100).toFixed(2)) : 0.0;

    res.status(200).json({
      completed,
      total,
      progress,
      completedSessionIds: completedSessions.map((s) => s.sessionId),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

  
  

const getAllCourses = async (req, res) => {
    try {
      const courses = await prisma.course.findMany({
        include: {
          sessions: true,  
        },
      });
      res.status(200).json(courses);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  

  const getStudentProfile = async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.user || !req.user.userId) {
        console.error("Missing user ID in request");
        return res.status(401).json({ message: "Unauthorized or invalid token" });
      }
  
      // Fetch student data and their enrolled courses
      const student = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          enrollments: {
            include: { 
              course: {
                include: {
                  sessions: true,  
                }
              },
            },
          },
        },
      });
  
      if (!student) {
        console.error("Student not found in DB");
        return res.status(404).json({ message: "Student not found" });
      }
  
      // Filter enrolled and completed courses
      const enrolledCourses = student.enrollments.filter(e => !e.completed);
      const completedCourses = student.enrollments.filter(e => e.completed);
  
      // Calculate progress for enrolled courses
      const enrolledCoursesWithProgress = enrolledCourses.map(e => {
        const totalSessions = e.course.sessions.length;
        const completedSessions = e.course.sessions.filter(session => session.completed).length;
        const progress = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
  
        return {
          title: e.course.title,
          progress: progress.toFixed(2), // Ensure we return progress as a string with 2 decimals
        };
      });
  
      res.json({
        name: student.name,
        email: student.email,
        enrolledCoursesCount: enrolledCoursesWithProgress.length,
        enrolledCourses: enrolledCoursesWithProgress,
        completedCoursesCount: completedCourses.length,
        completedCourses: completedCourses.map(e => e.course.title),
      });
    } catch (err) {
      console.error("Error in getStudentProfile:", err);
      res.status(500).json({ message: "Failed to fetch student profile" });
    }
  };
  
  const completeCourse = async (req, res) => {
    try {
      const { courseId } = req.body;
  
      if (!req.user || !req.user.userId) {
        console.error("Missing user ID in request");
        return res.status(401).json({ message: "Unauthorized or invalid token" });
      }
  
      // Find the enrollment record of the student for the course
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: req.user.userId,
          courseId:Number(courseId),
        },
      });
  
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
  
      // Update the course completion status
      const updatedEnrollment = await prisma.enrollment.update({
        where: {
          id: enrollment.id,
        },
        data: {
          completed: true, // Mark as completed
        },
      });
  
      res.json({
        message: "Course marked as completed",
        courseId: updatedEnrollment.courseId,
      });
    } catch (err) {
      console.error("Error in completeCourse:", err);
      res.status(500).json({ message: "Failed to update course completion" });
    }
  };
  
module.exports = {
  enrollInCourse,
  getEnrolledCourses,
  getCourseSessions,
  getStudentProfile,
  completeSession,
  completeCourse,
  getCourseProgress,
  getAllCourses
};
