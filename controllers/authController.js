const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }
    let photo="";
     if(req.file){
      photo = req.file.path;
     }
    const { name, email, password, about, height, weight, location, debut } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      photo,
      about,
      height,
      weight,
      location,
      debut: debut || Date.now()
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          about: user.about,
          height: user.height,
          weight: user.weight,
          location: user.location,
          debut: user.debut,
          photo: user.photo
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check if user exists and include password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
   const token = jwt.sign(
  { id: user._id },   // ✅ match middleware
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
  
 res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // only HTTPS in production
      sameSite: "None", // must be None for cross-origin
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
        }
        
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging in user',
      error: error.message
    });
  }
};

module.exports = { register, login };
