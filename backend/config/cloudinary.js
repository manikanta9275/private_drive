const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");

// Configure Cloudinary from environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a PDF file buffer to Cloudinary using streaming.
 * @param {Buffer} buffer - File buffer from Multer
 * @param {string} originalname - Original file name
 * @returns {Promise<{ secure_url: string, public_id: string, bytes: number }>}
 */
function uploadPdfStream(buffer, originalname) {
    return new Promise((resolve, reject) => {
        // Sanitize file name for public_id
        const sanitizedBaseName = originalname
            .replace(/\.[^/.]+$/, "")
            .replace(/[^a-zA-Z0-9_-]/g, "_")
            .substring(0, 50);

        const uniquePublicId = `pdf_${Date.now()}_${sanitizedBaseName}`;

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "private_pdf_drive",
                public_id: uniquePublicId,
                resource_type: "auto",
                format: "pdf"
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary upload error:", error);
                    return reject(new Error(error.message || "Failed to upload PDF to cloud storage"));
                }
                resolve(result);
            }
        );

        Readable.from(buffer).pipe(uploadStream);
    });
}

/**
 * Delete a PDF file from Cloudinary by its public ID.
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<any>}
 */
async function deletePdfFile(publicId) {
    try {
        // Try auto/raw resource types as PDFs may be stored as image or raw depending on Cloudinary account settings
        const resImage = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
        if (resImage.result === "ok") return resImage;

        const resRaw = await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
        return resRaw;
    } catch (error) {
        console.error("Cloudinary delete error:", error);
        throw error;
    }
}

module.exports = {
    cloudinary,
    uploadPdfStream,
    deletePdfFile
};

