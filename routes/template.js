const express = require("express");
const router = express.Router();
const TemplateModel = require("../model/templateModel");
const multer = require("multer");
const stream = require("stream");
const mongoose = require("mongoose");

// Enhanced file upload configuration
const uploadConfig = {
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024, // 10MB file size limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/json",
      "image/webp",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Invalid file type. Only images and JSON are allowed."),
        false
      );
    }
  },
};
const upload = multer(uploadConfig);

// Centralized error handler
const handleError = (
  res,
  error,
  message = "Internal server error",
  statusCode = 500
) => {
  console.error(message, error);
  res.status(statusCode).json({
    status: false,
    message,
    error: error.message,
  });
};

router.post(
  "/create",
  upload.fields([{ name: "file" }, { name: "jsonFile" }]),
  async (req, res) => {
    try {
      const {
        files,
        body: { name },
      } = req;
      const file = files?.file?.[0];
      const jsonFile = files?.jsonFile?.[0];
      console.log(files, "thisisfiles");
      // Debug logs
      console.log("Received file:", file?.originalname);
      console.log("Received JSON file:", jsonFile?.originalname);

      // Validate input
      if (!file) {
        return res
          .status(400)
          .json({ status: false, message: "File is required." });
      }

      if (!jsonFile) {
        return res
          .status(400)
          .json({ status: false, message: "JSON file is required." });
      }

      if (!name) {
        return res
          .status(400)
          .json({ status: false, message: "Template name is required." });
      }
      const base64Image = await file.buffer.toString("base64");

      // Create GridFS bucket
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db);

      // Function to upload files to GridFS
      const uploadFileToGridFS = (fileBuffer, fileName, contentType) => {
        return new Promise((resolve, reject) => {
          const bufferStream = new stream.PassThrough();
          bufferStream.end(fileBuffer);

          const uploadStream = bucket.openUploadStream(fileName, {
            metadata: {
              contentType,
              name,
              uploadedAt: new Date(),
              base64_image: base64Image,
            },
          });
          console.log(uploadStream, "new base64image added");
          bufferStream.pipe(uploadStream);

          uploadStream.on("error", (err) => reject(err));
          uploadStream.on("finish", () => resolve(uploadStream.id));
        });
      };

      try {
        // Upload main file and JSON file
        const fileId = await uploadFileToGridFS(
          file.buffer,
          file.originalname,
          file.mimetype
        );
        const jsonFileId = await uploadFileToGridFS(
          jsonFile.buffer,
          jsonFile.originalname,
          jsonFile.mimetype
        );

        // Verify file IDs
        if (!fileId || !jsonFileId) {
          return res
            .status(500)
            .json({ status: false, message: "File upload failed" });
        }

        // Create template record
        const template = await TemplateModel.create({
          fileId,
          jsonFileId, // Store JSON file ID
          name,
          contentType: file.mimetype,
          originalName: file.originalname,
          // base64_image: base64Image, // Add base64 image here
        });

        // Respond with success
        res.status(201).json({
          status: true,
          template: {
            id: template._id,
            name: template.name,
            fileId: template.fileId,
            jsonFileId: template.jsonFileId, // Return JSON file ID
          },
        });
      } catch (err) {
        console.error("Upload or template creation error:", err);
        res.status(500).json({
          status: false,
          message: "Failed to upload files",
          error: err.message,
        });
      }
    } catch (err) {
      console.error("Server error:", err);
      res
        .status(500)
        .json({ status: false, message: "Server error", error: err.message });
    }
  }
);

router.get("/find/:fileId", async (req, res) => {
  // console.log("Template download route hit"); // Add this log to see if the route is being triggered

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
    const fileDocument = await mongoose.connection.db
      .collection("fs.files")
      .findOne({ _id: objectId });

    if (!fileDocument) {
      return res.status(404).json({
        status: false,
        message: "File not found",
      });
    }

    // console.log("File Document found:", fileDocument); // Debug log

    // Set up GridFSBucket for downloading
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db);

    // Create a download stream using the file ID
    const downloadStream = bucket.openDownloadStream(objectId);

    // Set appropriate response headers
    res.set(
      "Content-Type",
      fileDocument.metadata?.contentType || "application/octet-stream"
    );
    res.set(
      "Content-Disposition",
      `inline; filename="${fileDocument.filename}"`
    );

    // Pipe the download stream to the response
    downloadStream.pipe(res);

    // Handle stream errors
    downloadStream.on("error", (err) => {
      console.error("Download stream error:", err);
      res.status(500).json({
        status: false,
        message: "Error retrieving file",
      });
    });
  } catch (err) {
    console.error("Template retrieval error:", err);
    res.status(500).json({
      status: false,
      message: "Server error",
      error: err.message,
    });
  }
});

// // Retrieve all templates
router.get("/get-templates", async (req, res) => {
  try {
    console.log("call reached");
    // Fetch files directly from gfs.files collection
    const files = await mongoose.connection.db
      .collection("fs.files")
      .find({ "metadata.contentType": "application/json" })
      .sort({ _id: -1 })
      .limit(10)
      .toArray();

    if (files.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No files found.",
      });
    }
    // Map files to simplified response
    // console.log(files[66], "thisisfile");
    const templateList = files.map((file) => {
      // console.log(file, "thisisfile");
      return {
        id: file._id,
        name: file.metadata?.name || file.filename,
        fileId: file._id,
        contentType: file.metadata?.contentType || "application/octet-stream",
        originalName: file.filename,
        base64Image: file.metadata?.base64_image || null,
      };
    });

    res.status(200).json({
      status: true,
      templates: templateList,
    });
  } catch (err) {
    console.error("Error retrieving files:", err);
    res.status(500).json({
      status: false,
      message: "Server error",
      error: err.message,
    });
  }
});

// router.get("/get-templates", async (req, res) => {
//   try {
//     // Fetch templates from the TemplateModel collection
//     console.log("call camed");
//     const templates = await TemplateModel.find({});

//     if (templates.length === 0) {
//       return res.status(404).json({
//         status: false,
//         message: "No templates found.",
//       });
//     }

//     // Map templates to simplified response
//     // console.log(templates[60].base64_image, "thisisfsdfs");
//     const templateList = templates.map((template) => {
//       return {
//         id: template._id,
//         name: template.name,
//         fileId: template.fileId,
//         contentType: template.contentType,
//         originalName: template.originalName,
//         base64Image: template.base64_image, // This will now return the correct base64 image
//       };
//     });

//     res.status(200).json({
//       status: true,
//       templates: templateList,
//     });
//   } catch (err) {
//     console.error("Error retrieving templates:", err);
//     res.status(500).json({
//       status: false,
//       message: "Server error",
//       error: err.message,
//     });
//   }
// });

router.delete("/delete/:templateId", async (req, res) => {
  try {
    const { templateId } = req.params;

    // Validate ObjectId
    // if (!mongoose.Types.ObjectId.isValid(templateId)) {
    //   return res.status(400).json({
    //     status: false,
    //     message: "Invalid template ID",
    //   });
    // }

    // Find the template in TemplateModel
    // const template = await TemplateModel.findById(templateId);
    // if (!template) {
    //   return res.status(404).json({
    //     status: false,
    //     message: "Template not found",
    //   });
    // }
    const template = await TemplateModel.findOne({ name: templateId });
    console.log(template, "thisisdfsdfte");
    if (!template) {
      return res.status(404).json({
        status: false,
        message: "Template not found",
      });
    }

    // Create GridFSBucket instance
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db);

    // Delete the associated files from GridFS
    const deleteFileFromGridFS = async (fileId) => {
      if (!fileId || !mongoose.Types.ObjectId.isValid(fileId)) return;
      await mongoose.connection.db
        .collection("fs.files")
        .deleteOne({ _id: new mongoose.Types.ObjectId(fileId) });
      await mongoose.connection.db
        .collection("fs.chunks")
        .deleteMany({ files_id: new mongoose.Types.ObjectId(fileId) });
    };

    await deleteFileFromGridFS(template.fileId);
    await deleteFileFromGridFS(template.jsonFileId);

    // Delete the template record from the database
    await TemplateModel.findByIdAndDelete(template._id);

    res.status(200).json({
      status: true,
      message: "Template deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting template:", err);
    res.status(500).json({
      status: false,
      message: "Server error",
      error: err.message,
    });
  }
});

module.exports = router;

// VitjZ6rnbbMxk3mf
