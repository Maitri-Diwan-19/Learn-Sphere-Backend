const express = require('express');
const cors = require('cors');
const app = express();
const cookieParser = require("cookie-parser")
const authRoute = require('./routes/authRoute')
const course = require('./routes/courseRoute')
const student = require('./routes/studentRoute');
const passport = require('./DB/Passport')
const session = require('express-session')
require('dotenv').config()
const port = process.env.PORT || 3000


app.use(express.json());

app.use(cors({
    origin: 'http://localhost:5173', 
    credentials: true
  }));
app.use(cookieParser());

app.use(session({
    secret: 'maitri',  
    resave: false,
    saveUninitialized: false
  }));

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth',authRoute);
app.use('/api/course',course);
 app.use('/api/student',student);
 
app.use ((err,req,res,next)=>{
    console.log(err.stack);
    res.status(500).json({message:"something went wrong"})
})

app.listen(port,()=>{
    console.log(`server is running on port ${port}`)
})