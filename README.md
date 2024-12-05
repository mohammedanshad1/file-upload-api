# Media Upload API

This is a Node.js-based API for uploading large media files (videos or documents) with a minimum size requirement of 100MB. It includes functionality for uploading, retrieving, and serving files.

## Features

- Upload large files (100MB minimum) using `multer`.
- Stores uploaded files in a local `uploads` directory.
- Provides an endpoint to list all uploaded files with their URLs.
- Built-in file size validation to restrict files above 100MB.
- Error handling for seamless user experience.

## Requirements

- Node.js (v14 or above)
- npm (Node Package Manager)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/media-upload-api.git
   cd media-upload-api
