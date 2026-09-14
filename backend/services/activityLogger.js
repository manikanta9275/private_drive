const mongoose = require("mongoose");
const activityLogSchema = require("../models/ActivityLog");

let logConnection = null;
let ActivityLogModel = null;

function getLogModel() {
    if (ActivityLogModel) return ActivityLogModel;

    const logUri = process.env.LOG_MONGODB_URI;

    if (logUri && logUri !== process.env.MONGODB_URI) {
        try {
            logConnection = mongoose.createConnection(logUri);
            ActivityLogModel = logConnection.model("ActivityLog", activityLogSchema);
            console.log("Connected to separate Activity Logs database successfully");
            return ActivityLogModel;
        } catch (error) {
            console.warn("Failed to connect to separate LOG_MONGODB_URI, falling back to main DB:", error.message);
        }
    }

    // Fallback to default mongoose connection
    ActivityLogModel = mongoose.model("ActivityLog", activityLogSchema);
    return ActivityLogModel;
}

/**
 * Asynchronously log a system or user activity without blocking requests.
 */
async function logActivity({ userId, userName, userEmail, action, details = {}, req = null }) {
    try {
        const Model = getLogModel();

        let ipAddress = "Unknown";
        let userAgent = "Unknown";

        if (req) {
            ipAddress = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "Unknown";
            userAgent = req.headers["user-agent"] || "Unknown";
        }

        await Model.create({
            userId,
            userName: userName || "Unknown User",
            userEmail: userEmail || "Unknown Email",
            action,
            details,
            ipAddress,
            userAgent
        });
    } catch (err) {
        // Non-blocking: we never want a failed log entry to crash the main user operation
        console.error("Failed to write activity log:", err.message || err);
    }
}

/**
 * Fetch logs for admin view.
 */
async function getRecentLogs(limit = 100) {
    const Model = getLogModel();
    return await Model.find().sort({ createdAt: -1 }).limit(limit).lean();
}

/**
 * Get total count of activity logs.
 */
async function getLogsCount() {
    const Model = getLogModel();
    return await Model.countDocuments();
}

module.exports = {
    logActivity,
    getRecentLogs,
    getLogsCount,
    getLogModel
};

