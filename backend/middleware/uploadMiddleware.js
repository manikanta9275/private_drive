const multer = require("multer");
const path = require("path");

// Use memory storage so we can stream directly to Cloudinary
const storage = multer.memoryStorage();

// Accept PDFs and common image formats for the shared drive uploader.
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;
    const isPdf = ext === ".pdf" && (mime === "application/pdf" || mime === "application/x-pdf");
    const isImage = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mime)
        && [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);

    if (isPdf || isImage) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only PDF, JPG, PNG, GIF, and WEBP files are allowed."), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 15 * 1024 * 1024 // 15 MB max limit
    }
});

/**
 * Middleware wrapper to catch Multer errors cleanly and return JSON.
 */
function handlePdfUpload(req, res, next) {
    const singleUpload = upload.single("pdf");

    singleUpload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    message: "File size exceeds the 15 MB limit. Please select a smaller file."
                });
            }
            return res.status(400).json({
                message: `Upload error: ${err.message}`
            });
        } else if (err) {
            return res.status(400).json({
                message: err.message || "Failed to process PDF upload."
            });
        }

        if (!req.file) {
            return res.status(400).json({
                message: "No file provided. Please choose a PDF or image to upload."
            });
        }

        next();
    });
}

module.exports = {
    handlePdfUpload
};

