const express = require('express');
const {login,register, refreshToken, getMe,googleCallback,googleLogin, updateRole, logout} = require('../controller/authController');
const passport = require('../DB/Passport');

const router = express.Router();
router.post('/register',register);
router.post('/login',login);
router.post('/refreshtoken',refreshToken);
router.post('/logout',logout)
router.get('/me',getMe)


router.put('/user-role',updateRole);
// Google Login route
router.get('/google', googleLogin);

// Google Callback route
router.get('/google/callback',passport.authenticate('google',{failureRedirect:'/login?error=auth_failed'}),
 googleCallback);
module.exports =router;