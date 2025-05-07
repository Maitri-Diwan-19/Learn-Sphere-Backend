const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const prisma = require('./db.config'); 
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
        let user = await prisma.user.findUnique({
          where: { email: profile.emails[0].value },
        });

        let isNewUser = false;

        // If user doesn't exist, create a new user
        if (!user) {
          user = await prisma.user.create({
            data: {
              name: profile.displayName,
              email: profile.emails[0].value,
              password: null, //  it's OAuth, no password is used
              role: 'STUDENT', 
            },
          });
          isNewUser = true;
        }

        // Attach isNewUser flag to the user object for further use
        return done(null, { ...user, isNewUser });
      } catch (error) {
        console.error('Google Auth Error:', error);
        return done(error, null); 
      }
    }
  )
);


passport.serializeUser((user, done) => {
  done(null, user.id); 
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user); 
  } catch (error) {
    done(error, null);
  }
});


module.exports = passport;
