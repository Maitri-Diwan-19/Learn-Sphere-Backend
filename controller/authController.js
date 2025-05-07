const prisma = require("../DB/db.config");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {loginSchema,registerSchema} = require('../validator/authvalidator');
const passport = require('../DB/Passport')
const register = async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  const { email, password, role,name } = req.body;
  try {
    const hashedpass = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedpass,
        role: role.toUpperCase(),
      },
    });
    res.status(201).json({
        message: "User registered successfully",
        user: { id: user.id, email: user.email, role: user.role },
      });
  } catch (error) {
    res.status(400).json({ message: "User registration failed", error: error.message });
  }
};

const login = async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Access Token (short-lived)
    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1m" }
    );

    // Refresh Token (long-lived)
    const refreshToken = jwt.sign(
      { id: user.id ,role:user.role},
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Set both cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 1* 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: { id: user.id, email: user.email, role: user.role },
    });

  } catch (err) {
    res.status(500).json({ message: "Login error", error: err.message });
  }
};


const refreshToken = (req, res) => {
  console.log("Cookies in /refreshtoens:", req.cookies); 
  const token = req.cookies.refreshToken;
  if (!token) {
    return res.status(401).json({ message: "No refresh token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const accessToken = jwt.sign(
      { id: decoded.id, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: "1m" }
    );

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 1 * 60 * 1000,
    });

    res.json({ message: "Access token refreshed" });

  } catch (err) {
    res.status(403).json({ message: "Invalid refresh token" });
  }
};
// const getMe = (req, res) => {
//   console.log("Cookies in /me:", req.cookies);
//   const token = req.cookies.accessToken; 
//   if (!token) {
//     return res.status(401).json({ message: 'Unauthorized' });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     res.status(200).json({ user: decoded });
//   } catch (err) {
//     res.status(401).json({ message: 'Invalid token' });
//   }
// };
const getMe = (req, res) =>{
  const token = req.cookies.accessToken;

  if (!token) return res.json({ authenticated: false });

  try {
    const decoded = jwt.verify(token,  process.env.JWT_SECRET);
    return res.json({
      authenticated: true,
      user: { id: decoded.id, role: decoded.role, name: decoded.name },
    });
  } catch (err) {
    return res.json({ authenticated: false });
  }
}
const googleLogin=passport.authenticate('google',{
  scope: ['profile','email'],
});


const googleCallback = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.redirect('/login?error=auth_failed');
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user.id, role: user.role || null, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1m" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, role: user.role || null },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Set cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 1 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Redirect based on role
    if (!user.role) {
      return res.redirect(`${process.env.FRONTEND_URL}/select-role`);
    } else if (user.role === "INSTRUCTOR") {
      return res.redirect(`${process.env.FRONTEND_URL}/instructor/dashboard`);
    } else {
      return res.redirect(`${process.env.FRONTEND_URL}/student/dashboard`);
    }
  } catch (error) {
    console.error("Google Callback Error:", error);
    return res.redirect('/login?error=google_auth_failed');
  }
};

const updateRole = async (req, res) => {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ message: "Role is required" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role.toUpperCase() },
    });

    // Optionally update token with new role
    const newAccessToken = jwt.sign(
      { id: updatedUser.id, role: updatedUser.role, name: updatedUser.name },
      process.env.JWT_SECRET,
      { expiresIn: "1m" }
    );

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 1 * 60 * 1000,
    });

    return res.json({
      message: "Role updated successfully",
      user: { id: updatedUser.id, role: updatedUser.role },
    });
  } catch (error) {
    console.error("Update Role Error:", error);
    return res.status(500).json({ message: "Failed to update role", error: error.message });
  }
};

const logout = (req, res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
  });

  return res.status(200).json({ message: "Logged out successfully" });
};

module.exports ={register,login,refreshToken,getMe,googleLogin,googleCallback,updateRole,logout};