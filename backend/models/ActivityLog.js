const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        userName: {
            type: String,
            default: "Anonymous"
        },
        userEmail: {
            type: String,
            default: "N/A"
        },
        action: {
            type: String,
            required: true,
            enum: [
                "USER_LOGIN",
                "PDF_UPLOAD",
                "PDF_VIEW",
                "PDF_DOWNLOAD",
                "PDF_DELETE",
                "PDF_RENAME",
                "ADMIN_CREATE_USER",
                "ADMIN_CREATE_ADMIN",
                "ADMIN_DELETE_USER",
                "ADMIN_DELETE_ADMIN",
                "ADMIN_REGENERATE_PIN",
                "ADMIN_REGENERATE_ADMIN_PIN",
                "ADMIN_DELETE_PDF"
            ]
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        ipAddress: {
            type: String,
            default: "Unknown"
        },
        userAgent: {
            type: String,
            default: "Unknown"
        }
    },
    {
        timestamps: true
    }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

module.exports = activityLogSchema;
