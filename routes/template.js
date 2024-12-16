const express = require("express");
const router = express.Router();
const TemplateModel = require("../model/templateModel");
const multer = require("multer");
const stream = require('stream');
const mongoose = require("mongoose");

// Enhanced file upload configuration
const uploadConfig = {
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/json', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and JSON are allowed.'), false);
    }
  }
};
const upload = multer(uploadConfig);

// Centralized error handler
const handleError = (res, error, message = "Internal server error", statusCode = 500) => {
  console.error(message, error);
  res.status(statusCode).json({ 
    status: false, 
    message,
    error: error.message 
  });
};

router.post("/create", upload.single("file"), async (req, res) => {
  try {
    const { file, body: { name } } = req;

    // Debug logs
    console.log("Received file:", file);
    console.log("File buffer exists:", !!file?.buffer);
    console.log("File buffer length:", file?.buffer?.length);

    // Validate input
    if (!file) {
      return res.status(400).json({
        status: false,
        message: "File is required.",
      });
    }

    if (!name) {
      return res.status(400).json({
        status: false,
        message: "Template name is required.",
      });
    }

    // Create GridFS bucket
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db);

    // Promisified file upload with more robust error handling
    const uploadFileToGridFS = () => {
      return new Promise((resolve, reject) => {
        // Create a readable stream from the buffer
        const bufferStream = new stream.PassThrough();
        bufferStream.end(file.buffer);

        // Open upload stream
        const uploadStream = bucket.openUploadStream(file.originalname, {
          metadata: {
            contentType: file.mimetype,
            name,
            uploadedAt: new Date(),
          },
        });

        // Pipe the buffer stream to GridFS upload stream
        bufferStream.pipe(uploadStream);

        // Tracking upload progress
        let uploadedBytes = 0;
        bufferStream.on('data', (chunk) => {
          uploadedBytes += chunk.length;
          console.log(`Uploaded ${uploadedBytes} bytes`);
        });

        // Handle errors
        uploadStream.on('error', (err) => {
          console.error("GridFS Upload Stream Error:", err);
          reject(err);
        });

        uploadStream.on('finish', () => {
          console.log("Upload stream finished");
          // Use the ID from uploadStream
          resolve(uploadStream.id);
        });
      });
    };

    try {
      // Upload file to GridFS
      const fileId = await uploadFileToGridFS();

      // Verify fileId
      if (!fileId) {
        console.error("No file ID generated");
        return res.status(500).json({ 
          status: false, 
          message: "File upload failed: No file ID generated" 
        });
      }

      // Create template record
      const template = await TemplateModel.create({
        fileId,
        name,
        contentType: file.mimetype,
        originalName: file.originalname,
      });

      // Respond with success
      res.status(201).json({
        status: true,
        template: {
          id: template._id,
          name: template.name,
          fileId: template.fileId,
        },
      });

    } catch (err) {
      console.error("Upload or template creation error:", err);
      res.status(500).json({ 
        status: false, 
        message: "Failed to upload file or create template",
        error: err.message 
      });
    }

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ 
      status: false, 
      message: "Server error",
      error: err.message 
    });
  }
});


router.get("/find/:fileId", async (req, res) => {
  console.log("Template download route hit");  // Add this log to see if the route is being triggered

  try {
    const { fileId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({
        status: false,
        message: "Invalid file ID",
      });
    }

    // Convert the fileId to an ObjectId
    const objectId = new mongoose.Types.ObjectId(fileId);

    // Find the file in fs.files collection
    const fileDocument = await mongoose.connection.db.collection('fs.files').findOne({ _id: objectId });

    if (!fileDocument) {
      return res.status(404).json({
        status: false,
        message: "File not found",
      });
    }

    console.log("File Document found:", fileDocument); // Debug log

    // Set up GridFSBucket for downloading
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db);

    // Create a download stream using the file ID
    const downloadStream = bucket.openDownloadStream(objectId);

    // Set appropriate response headers
    res.set('Content-Type', fileDocument.metadata?.contentType || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${fileDocument.filename}"`);

    // Pipe the download stream to the response
    downloadStream.pipe(res);

    // Handle stream errors
    downloadStream.on('error', (err) => {
      console.error('Download stream error:', err);
      res.status(500).json({
        status: false,
        message: "Error retrieving file",
      });
    });

  } catch (err) {
    console.error('Template retrieval error:', err);
    res.status(500).json({
      status: false,
      message: "Server error",
      error: err.message,
    });
  }
});



// Retrieve all templates
router.get("/get-templates", async (req, res) => {
  try {
    // Fetch files directly from gfs.files collection
    const files = await mongoose.connection.db.collection('fs.files').find({}).toArray();

    if (files.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No files found.",
      });
    }

    // Map files to simplified response
    const templateList = files.map(file => ({
      id: file._id,
      name: file.metadata?.name || file.filename,
      fileId: file._id,
      contentType: file.metadata?.contentType || 'application/octet-stream',
      originalName: file.filename
    }));

    res.status(200).json({
      status: true,
      templates: templateList,
    });

  } catch (err) {
    console.error('Error retrieving files:', err);
    res.status(500).json({ 
      status: false, 
      message: "Server error",
      error: err.message 
    });
  }
});

module.exports = router;