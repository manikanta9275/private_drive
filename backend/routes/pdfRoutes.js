const express = require("express");
const fs = require("fs");
const path = require("path");
const PDF = require("../models/PDF");
const Folder = require("../models/Folder");
const authenticate = require("../middleware/authMiddleware");
const { handlePdfUpload } = require("../middleware/uploadMiddleware");
const { uploadPdfStream, deletePdfFile } = require("../config/cloudinary");
const { logActivity } = require("../services/activityLogger");

const router = express.Router();

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// All PDF routes require user authentication
router.use(authenticate);

/**
 * POST /api/pdfs/upload
 * Upload PDF to both local storage (for fast, guaranteed preview/download) and Cloudinary.
 */
router.post("/upload", handlePdfUpload, async (req, res) => {
    try {
        const file = req.file;
        let folderId = null;
        const requestedFileName = typeof req.body.fileName === "string"
            ? req.body.fileName.trim()
            : file.originalname;
        const safeFileName = path.basename(requestedFileName)
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 120);

        if (!safeFileName) {
            return res.status(400).json({ message: "Please provide a valid PDF name." });
        }

        const fileName = safeFileName.toLowerCase().endsWith(".pdf")
            ? safeFileName
            : `${safeFileName}.pdf`;

        if (req.body.folderId) {
            const folder = await Folder.findOne({ _id: req.body.folderId, userId: req.user.userId });
            if (!folder) return res.status(400).json({ message: "Selected folder was not found." });
            folderId = folder._id;
        }

        // 1. Save local copy for guaranteed, restriction-free delivery
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        const uniqueLocalName = `pdf_${Date.now()}_${sanitizedName}`;
        const localFilePath = path.join(uploadsDir, uniqueLocalName);
        fs.writeFileSync(localFilePath, file.buffer);

        // 2. Upload stream to Cloudinary
        let uploadResult = null;
        try {
            uploadResult = await uploadPdfStream(file.buffer, file.originalname);
        } catch (cloudErr) {
            console.warn("Cloudinary upload warning:", cloudErr.message);
        }

        // 3. Save PDF record to MongoDB
        const newPdf = await PDF.create({
            userId: req.user.userId,
            folderId,
            fileName,
            fileUrl: uploadResult?.secure_url || `/api/pdfs/local/${uniqueLocalName}`,
            cloudinaryPublicId: uploadResult?.public_id || `local_${uniqueLocalName}`,
            fileSize: file.size,
            localPath: localFilePath
        });

        // 4. Asynchronously log upload activity
        logActivity({
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: "PDF_UPLOAD",
            details: {
                pdfId: newPdf._id,
                fileName: newPdf.fileName,
                fileSize: newPdf.fileSize
            },
            req
        });

        res.status(201).json({
            message: "PDF uploaded successfully",
            pdf: newPdf
        });

    } catch (error) {
        console.error("PDF upload route error:", error);
        res.status(500).json({
            message: error.message || "Failed to upload PDF. Please try again."
        });
    }
});

/**
 * PATCH /api/pdfs/:id/name
 * Rename a PDF without changing its stored file contents.
 */
router.patch("/:id/name", async (req, res) => {
    try {
        const pdf = await PDF.findById(req.params.id);

        if (!pdf) {
            return res.status(404).json({ message: "PDF file not found." });
        }

        if (pdf.userId.toString() !== req.user.userId && req.user.role !== "admin") {
            return res.status(403).json({ message: "You are not authorized to rename this file." });
        }

        const requestedFileName = typeof req.body.fileName === "string"
            ? req.body.fileName.trim()
            : "";
        const safeFileName = path.basename(requestedFileName)
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 120);

        if (!safeFileName) {
            return res.status(400).json({ message: "Please provide a valid PDF name." });
        }

        const fileName = safeFileName.toLowerCase().endsWith(".pdf")
            ? safeFileName
            : `${safeFileName}.pdf`;
        const previousFileName = pdf.fileName;
        pdf.fileName = fileName;
        await pdf.save();

        logActivity({
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: "PDF_RENAME",
            details: {
                pdfId: pdf._id,
                fileName,
                previousFileName
            },
            req
        });

        res.json({ message: "PDF renamed successfully.", pdf });
    } catch (error) {
        console.error("Rename PDF error:", error);
        res.status(500).json({ message: "Failed to rename PDF file." });
    }
});

/**
 * GET /api/pdfs
 * List all PDFs for the authenticated user, with search and sort support.
 */
router.get("/", async (req, res) => {
    try {
        const { search, sortBy, folderId } = req.query;

        const query = { userId: req.user.userId };

        if (folderId === "root") {
            query.folderId = null;
        } else if (folderId && folderId !== "all") {
            const folder = await Folder.findOne({ _id: folderId, userId: req.user.userId });
            if (!folder) return res.status(404).json({ message: "Folder not found." });
            query.folderId = folder._id;
        }

        // Search by file name
        if (search && search.trim()) {
            query.fileName = { $regex: search.trim(), $options: "i" };
        }

        // Sorting options
        let sortOption = { createdAt: -1 }; // default newest first
        if (sortBy === "oldest") {
            sortOption = { createdAt: 1 };
        } else if (sortBy === "name_asc") {
            sortOption = { fileName: 1 };
        } else if (sortBy === "name_desc") {
            sortOption = { fileName: -1 };
        } else if (sortBy === "size_asc") {
            sortOption = { fileSize: 1 };
        } else if (sortBy === "size_desc") {
            sortOption = { fileSize: -1 };
        }

        const pdfs = await PDF.find(query).sort(sortOption).lean();

        // Calculate total storage used by this user
        const totalStorageBytes = pdfs.reduce((acc, curr) => acc + (curr.fileSize || 0), 0);

        res.json({
            count: pdfs.length,
            totalStorageBytes,
            pdfs
        });

    } catch (error) {
        console.error("Fetch PDFs error:", error);
        res.status(500).json({
            message: "Failed to fetch PDF files."
        });
    }
});

/**
 * GET /api/pdfs/:id/view
 * Stream PDF inline for in-browser modal preview.
 */
router.get("/:id/view", async (req, res) => {
    try {
        const pdf = await PDF.findById(req.params.id);

        if (!pdf) {
            return res.status(404).json({ message: "PDF file not found." });
        }

        // Verify ownership (or admin)
        if (pdf.userId.toString() !== req.user.userId && req.user.role !== "admin") {
            return res.status(403).json({ message: "You are not authorized to view this file." });
        }

        // Log view activity
        logActivity({
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: "PDF_VIEW",
            details: {
                pdfId: pdf._id,
                fileName: pdf.fileName
            },
            req
        });

        // 1. Serve from local storage if file exists
        if (pdf.localPath && fs.existsSync(pdf.localPath)) {
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(pdf.fileName)}"`);
            return fs.createReadStream(pdf.localPath).pipe(res);
        }

        // 2. Otherwise fetch and stream from Cloudinary
        if (pdf.fileUrl && pdf.fileUrl.startsWith("http")) {
            const cloudResponse = await fetch(pdf.fileUrl);

            if (!cloudResponse.ok) {
                if (cloudResponse.status === 401) {
                    return res.status(403).json({
                        message: "Cloudinary has PDF delivery restricted on your account. Please uncheck 'PDF and ZIP files delivery' under Cloudinary Settings > Security, or re-upload this file."
                    });
                }
                return res.status(cloudResponse.status).json({
                    message: "Failed to retrieve PDF from cloud storage."
                });
            }

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(pdf.fileName)}"`);
            const arrayBuffer = await cloudResponse.arrayBuffer();
            return res.send(Buffer.from(arrayBuffer));
        }

        return res.status(404).json({ message: "PDF document data could not be located." });

    } catch (error) {
        console.error("View PDF error:", error);
        res.status(500).json({ message: "Failed to view PDF file." });
    }
});

/**
 * GET /api/pdfs/:id/download
 * Stream PDF as attachment for direct, reliable download.
 */
router.get("/:id/download", async (req, res) => {
    try {
        const pdf = await PDF.findById(req.params.id);

        if (!pdf) {
            return res.status(404).json({ message: "PDF file not found." });
        }

        // Verify ownership (or admin)
        if (pdf.userId.toString() !== req.user.userId && req.user.role !== "admin") {
            return res.status(403).json({ message: "You are not authorized to download this file." });
        }

        logActivity({
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: "PDF_DOWNLOAD",
            details: {
                pdfId: pdf._id,
                fileName: pdf.fileName,
                fileSize: pdf.fileSize
            },
            req
        });

        // 1. Serve from local storage if file exists
        if (pdf.localPath && fs.existsSync(pdf.localPath)) {
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(pdf.fileName)}"`);
            return fs.createReadStream(pdf.localPath).pipe(res);
        }

        // 2. Otherwise fetch and stream from Cloudinary
        if (pdf.fileUrl && pdf.fileUrl.startsWith("http")) {
            const cloudResponse = await fetch(pdf.fileUrl);

            if (!cloudResponse.ok) {
                if (cloudResponse.status === 401) {
                    return res.status(403).json({
                        message: "Cloudinary has PDF delivery restricted on your account. Please uncheck 'PDF and ZIP files delivery' under Cloudinary Settings > Security, or re-upload this file."
                    });
                }
                return res.status(cloudResponse.status).json({
                    message: "Failed to retrieve PDF from cloud storage."
                });
            }

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(pdf.fileName)}"`);
            const arrayBuffer = await cloudResponse.arrayBuffer();
            return res.send(Buffer.from(arrayBuffer));
        }

        return res.status(404).json({ message: "PDF document data could not be located." });

    } catch (error) {
        console.error("Download PDF error:", error);
        res.status(500).json({ message: "Failed to download PDF file." });
    }
});

/**
 * GET /api/pdfs/:id
 * Get details of a single PDF file (verifies user ownership or admin).
 */
router.get("/:id", async (req, res) => {
    try {
        const pdf = await PDF.findById(req.params.id);

        if (!pdf) {
            return res.status(404).json({ message: "PDF file not found." });
        }

        // Check ownership (or admin privileges)
        if (pdf.userId.toString() !== req.user.userId && req.user.role !== "admin") {
            return res.status(403).json({ message: "You are not authorized to view this file." });
        }

        res.json({ pdf });

    } catch (error) {
        console.error("Get PDF error:", error);
        res.status(500).json({ message: "Failed to retrieve PDF." });
    }
});

/**
 * DELETE /api/pdfs/:id
 * Delete PDF from local storage, Cloudinary, and MongoDB.
 */
router.delete("/:id", async (req, res) => {
    try {
        const pdf = await PDF.findById(req.params.id);

        if (!pdf) {
            return res.status(404).json({ message: "PDF file not found." });
        }

        // Ownership check (or admin)
        if (pdf.userId.toString() !== req.user.userId && req.user.role !== "admin") {
            return res.status(403).json({ message: "You are not authorized to delete this file." });
        }

        // 1. Delete local file if present
        if (pdf.localPath && fs.existsSync(pdf.localPath)) {
            try {
                fs.unlinkSync(pdf.localPath);
            } catch (fsErr) {
                console.warn("Could not delete local file:", fsErr.message);
            }
        }

        // 2. Delete from Cloudinary storage
        if (pdf.cloudinaryPublicId && !pdf.cloudinaryPublicId.startsWith("local_")) {
            try {
                await deletePdfFile(pdf.cloudinaryPublicId);
            } catch (cloudErr) {
                console.warn("Could not delete from Cloudinary, proceeding to delete from DB:", cloudErr.message);
            }
        }

        // 3. Delete from MongoDB
        await PDF.findByIdAndDelete(req.params.id);

        // 4. Log activity
        logActivity({
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: req.user.role === "admin" && pdf.userId.toString() !== req.user.userId
                ? "ADMIN_DELETE_PDF"
                : "PDF_DELETE",
            details: {
                pdfId: pdf._id,
                fileName: pdf.fileName,
                fileSize: pdf.fileSize
            },
            req
        });

        res.json({
            message: "PDF file deleted successfully.",
            deletedId: req.params.id
        });

    } catch (error) {
        console.error("Delete PDF error:", error);
        res.status(500).json({ message: "Failed to delete PDF file." });
    }
});

module.exports = router;

