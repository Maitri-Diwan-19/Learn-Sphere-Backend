const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const prisma = require('./db.config'); // Adjust path if needed
const dotenv = require('dotenv');

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists by email
        let user = await prisma.user.findUnique({
          where: { email: profile.emails[0].value },
        });

        let isNewUser = false;

        // If user doesn't exist, create a new user in the database
        if (!user) {
          user = await prisma.user.create({
            data: {
              name: profile.displayName,
              email: profile.emails[0].value,
              password: null, // Since it's OAuth, no password is used
              role: 'STUDENT', // Temporary default; can be modified based on logic
            },
          });
          isNewUser = true;
        }

        // Attach isNewUser flag to the user object for further use
        return done(null, { ...user, isNewUser });
      } catch (error) {
        console.error('Google Auth Error:', error);
        return done(error, null); // Return error if any occurs
      }
    }
  )
);

// Serialize user into the session
passport.serializeUser((user, done) => {
  done(null, user.id); // Save user ID in session
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user); // Attach the full user object to the session
  } catch (error) {
    done(error, null);
  }
});


module.exports = passport;
