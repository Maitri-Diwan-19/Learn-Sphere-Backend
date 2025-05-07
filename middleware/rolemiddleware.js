
const authorizeInstructor = (req, res, next) => {
    if (req.user.role !== "INSTRUCTOR") {
      return res.status(403).json({ message: "Access denied. Instructor only." });
    }
    next();
  };


  const isStudent = (req, res, next) => {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ message: 'Access denied. Students only.' });
    }
    next();
  };

  const authorize = (role) => {
    return (req, res, next) => {
      if (req.user.role !== role) {
        return res.status(403).json({ message: `Access denied. ${role}s only.` });
      }
      next();
    };
  };
  
  module.exports = {authorizeInstructor,isStudent,authorize};
  