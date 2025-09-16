const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  photo: {
    type: String,
    default: null
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  
  // --- NEW FIELDS ADDED HERE ---

  phone: {
    type: String, // Stored as String to preserve leading zeros and formatting
    unique: true,
    // sparse index allows for multiple documents to have a null/missing phone field,
    // but ensures that if a phone number is provided, it is unique.
    sparse: true, 
    match: [/^\d{10}$/, 'Please enter a valid phone number (10 digits)']
  },

  age: {
    type: Number,
    min: [16, 'Age must be at least 16'],
    max: [60, 'Age cannot exceed 60']
  },

  // --- END OF NEW FIELDS ---

  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  about: {
    type: String,
    maxlength: [500, 'About cannot exceed 500 characters'],
    default: ''
  },
  height: {
    type: Number,
    min: [100, 'Height must be at least 100 cm'],
    max: [250, 'Height cannot exceed 250 cm']
  },
  weight: {
    type: Number,
    min: [10, 'Weight must be at least 30 kg'],
    max: [200, 'Weight cannot exceed 200 kg']
  },
  location: {
    type: String,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  debut: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);