const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const port = 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Directory for storing uploaded chunks and final files
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// Temporary storage for upload metadata
const uploadStatus = new Map();

// Set up multer storage engine for chunk uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const { identifier, chunkNumber } = req.body;
    cb(null, `${identifier}_chunk_${chunkNumber}`);
  }
});

const upload = multer({ storage });

// Route to initiate an upload
app.post('/upload/start', (req, res) => {
  const { fileName, fileSize, fileType, totalChunks } = req.body;
  if (!fileName || !fileSize || !fileType || !totalChunks) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  // Generate a unique identifier for this upload
  const uniqueIdentifier = crypto.randomBytes(16).toString('hex');

  // Initialize upload metadata
  uploadStatus.set(uniqueIdentifier, {
    fileName,
    fileSize,
    fileType,
    totalChunks: parseInt(totalChunks),
    uploadedChunks: [],
    status: 'started',
    uploadPath: path.join(UPLOAD_DIR, fileName)
  });

  res.status(200).json({
    uploadIdentifier: uniqueIdentifier,
    message: 'Upload initialized.'
  });
});

// Route to upload a chunk
app.post('/upload/chunk', upload.single('chunk'), (req, res) => {
  const { identifier, chunkNumber } = req.body;
  if (!identifier || !chunkNumber) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  const status = uploadStatus.get(identifier);
  if (!status) {
    return res.status(404).json({ error: 'Upload not found.' });
  }

  if (status.status === 'paused') {
    return res.status(403).json({ error: 'Upload is paused.' });
  }

  // Prevent duplicate chunk uploads
  if (status.uploadedChunks.includes(chunkNumber)) {
    return res.status(400).json({ error: 'Chunk already uploaded.' });
  }

  // Add the uploaded chunk to the status
  status.uploadedChunks.push(chunkNumber);

  // Check if upload is complete
  if (status.uploadedChunks.length === status.totalChunks) {
    status.status = 'completed';

    // Merge chunks into the final file
    const finalFilePath = status.uploadPath;
    const writeStream = fs.createWriteStream(finalFilePath);

    for (let i = 1; i <= status.totalChunks; i++) {
      const chunkPath = path.join(UPLOAD_DIR, `${identifier}_chunk_${i}`);
      const data = fs.readFileSync(chunkPath);
      writeStream.write(data);
      fs.unlinkSync(chunkPath); // Delete chunk after merging
    }

    writeStream.end();
  }

  uploadStatus.set(identifier, status);

  res.status(200).json({
    message: 'Chunk uploaded successfully.',
    uploadedChunks: status.uploadedChunks
  });
});

// Route to pause upload
app.post('/upload/pause', (req, res) => {
  const { identifier } = req.body;

  const status = uploadStatus.get(identifier);
  if (!status) {
    return res.status(404).json({ error: 'Upload not found.' });
  }

  status.status = 'paused';
  uploadStatus.set(identifier, status);

  res.status(200).json({
    message: 'Upload paused.',
    uploadedChunks: status.uploadedChunks
  });
});

// Route to resume upload
app.post('/upload/resume', (req, res) => {
  const { identifier } = req.body;

  const status = uploadStatus.get(identifier);
  if (!status) {
    return res.status(404).json({ error: 'Upload not found.' });
  }

  status.status = 'resumed';
  uploadStatus.set(identifier, status);

  res.status(200).json({
    message: 'Upload resumed.',
    uploadedChunks: status.uploadedChunks
  });
});

// Route to check upload status
app.get('/upload/status/:identifier', (req, res) => {
  const { identifier } = req.params;

  const status = uploadStatus.get(identifier);
  if (!status) {
    return res.status(404).json({ error: 'Upload not found.' });
  }

  res.status(200).json({
    status: status.status,
    uploadedChunks: status.uploadedChunks,
    totalChunks: status.totalChunks
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
