// config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer-storage-cloudinary
// This sets up a storage engine that will save files to your Cloudinary account
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'kabaddiBd-profiles', // The name of the folder in Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg'], // Allowed image formats
    transformation: [{ width: 500, height: 500, crop: 'limit' }] // Optional transformations
  }
});

// Create the Multer upload instance
const upload = multer({ storage: storage });

module.exports = upload;