const Joi = require("joi");

// Register Validation Schema

const registerSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string()
      .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d]{6,}$"))
      .required()
      .messages({
        "string.pattern.base":
          "Password must be at least 6 characters long and include at least one uppercase letter, one lowercase letter, and one digit.",
      }),
    role: Joi.string().valid("STUDENT", "INSTRUCTOR").required(),
  });
  
// Login Validation Schema
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

module.exports = { registerSchema, loginSchema };
