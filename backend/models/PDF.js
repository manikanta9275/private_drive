const mongoose = require("mongoose");

const pdfSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        folderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Folder",
            default: null,
            index: true
        },

        fileName: {
            type: String,
            required: true,
            trim: true
        },

        fileType: {
            type: String,
            enum: ["pdf", "image"],
            default: "pdf",
            index: true
        },

        mimeType: {
            type: String,
            default: "application/pdf"
        },

        fileUrl: {
            type: String,
            required: true
        },

        cloudinaryPublicId: {
            type: String,
            required: true
        },

        fileSize: {
            type: Number,
            required: true
        },

        localPath: {
            type: String
        }
    },

    {
        timestamps: true
    }
);

// Compound index for user files sorted by creation date
pdfSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("PDF", pdfSchema);
