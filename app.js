const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Serve the uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Set up storage engine for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to filename
  }
});

// File size validation
const fileFilter = (req, file, cb) => {
    const fileSize = parseInt(req.headers['content-length']);
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
  
    if (fileSize > maxSize) {
      return cb(new Error('File size must be below 100MB'), false);
    }
  
    cb(null, true);
  };
const upload = multer({ storage: storage, fileFilter: fileFilter });

// Define the file upload route
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  res.status(200).send({
    message: 'File uploaded successfully!',
    filename: req.file.filename
  });
});

// Define the route to retrieve all files in the uploads directory
app.get('/files', (req, res) => {
  const uploadPath = path.join(__dirname, 'uploads');

  fs.readdir(uploadPath, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan directory: ' + err);
    }

    // const fileUrls = files.map(file => `http://localhost:3000/uploads/${file}`);
    const baseUrl = 'https://file-upload-api-7vv2.onrender.com';
    const fileUrls = files.map(file => `${baseUrl}/uploads/${file}`);

    res.status(200).send({
      files: fileUrls
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).send('File upload error: ' + err.message);
  } else if (err) {
    return res.status(400).send('Error: ' + err.message);
  }
  next();
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

