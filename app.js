const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const stream = require('stream');

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

// Store the current upload status (e.g., position of the upload)
const uploadStatus = {};

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

// Route to handle the pause functionality
app.post('/upload/pause/:filename', (req, res) => {
  const filename = req.params.filename;
  
  if (!uploadStatus[filename]) {
    return res.status(404).send('Upload not in progress.');
  }

  uploadStatus[filename].paused = true;
  res.status(200).send({ message: 'Upload paused.' });
});

// Route to handle the resume functionality
app.post('/upload/resume/:filename', (req, res) => {
  const filename = req.params.filename;

  if (!uploadStatus[filename]) {
    return res.status(404).send('Upload not in progress.');
  }

  uploadStatus[filename].paused = false;
  res.status(200).send({ message: 'Upload resumed.' });
});

// Define the route to retrieve all files in the uploads directory
app.get('/files', (req, res) => {
  const uploadPath = path.join(__dirname, 'uploads');

  fs.readdir(uploadPath, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan directory: ' + err);
    }

    const baseUrl = 'https://file-upload-api-7vv2.onrender.com';
    const fileUrls = files.map(file => `${baseUrl}/uploads/${file}`);

    res.status(200).send({
      files: fileUrls
    });
  });
});

// Custom upload function with pause and resume handling
app.post('/upload/stream', (req, res) => {
  const filename = Date.now() + path.extname(req.headers['filename']);
  const uploadPath = path.join(__dirname, 'uploads', filename);
  
  const writeStream = fs.createWriteStream(uploadPath);
  const bufferStream = new stream.PassThrough();
  
  let totalBytesWritten = 0;
  const maxSize = 100 * 1024 * 1024; // 100MB
  
  // Initialize the upload status
  uploadStatus[filename] = { paused: false, bytesWritten: 0 };
  
  req.on('data', chunk => {
    if (uploadStatus[filename].paused) {
      req.pause(); // Pause reading
      return;
    }

    if (totalBytesWritten + chunk.length > maxSize) {
      return res.status(400).send('File size exceeds limit.');
    }

    bufferStream.write(chunk);
    totalBytesWritten += chunk.length;
    uploadStatus[filename].bytesWritten = totalBytesWritten;

    bufferStream.pipe(writeStream);
  });

  req.on('end', () => {
    uploadStatus[filename].bytesWritten = totalBytesWritten;
    res.status(200).send({
      message: 'File upload completed!',
      filename: filename
    });
  });

  req.on('error', (err) => {
    res.status(500).send('Error during upload: ' + err.message);
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
