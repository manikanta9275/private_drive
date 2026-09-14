const express = require("express");
const fs = require("fs");
const User = require("../models/User");
const PDF = require("../models/PDF");
const authenticate = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");
const { getRecentLogs, getLogsCount, logActivity } = require("../services/activityLogger");
const { deletePdfFile } = require("../config/cloudinary");

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

/**
 * Generate a unique 4-digit PIN that does not collide with existing users or admin PIN
 */
async function generateUniquePin() {
    const adminPin = process.env.ADMIN_PIN || "9275";

    for (let attempts = 0; attempts < 50; attempts++) {
        const candidate = Math.floor(1000 + Math.random() * 9000).toString();

        if (candidate === adminPin) continue;

        const exists = await User.findOne({ pin: candidate });
        if (!exists) {
            return candidate;
        }
    }

    // Fallback timestamp-based PIN
    return (Date.now() % 9000 + 1000).toString();
}

/**
 * GET /api/admin/stats
 * Overview metrics
 */
router.get("/stats", async (req, res) => {
    try {
        const [totalUsers, totalPdfs, storageAggregation, totalLogs] = await Promise.all([
            User.countDocuments({ role: "user" }),
            PDF.countDocuments(),
            PDF.aggregate([
                {
                    $group: {
                        _id: null,
                        totalBytes: { $sum: "$fileSize" }
                    }
                }
            ]),
            getLogsCount()
        ]);

        const totalStorageBytes = storageAggregation.length > 0 ? storageAggregation[0].totalBytes : 0;

        res.json({
            totalUsers,
            totalPdfs,
            totalStorageBytes,
            totalLogs
        });
    } catch (error) {
        console.error("Admin stats error:", error);
        res.status(500).json({ message: "Failed to load admin statistics." });
    }
});

/**
 * GET /api/admin/users
 * List all users with their names, assigned 4-digit PINs, and file counts.
 */
router.get("/users", async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 }).lean();

        // Calculate PDF stats per user
        const pdfCounts = await PDF.aggregate([
            {
                $group: {
                    _id: "$userId",
                    count: { $sum: 1 },
                    totalSize: { $sum: "$fileSize" }
                }
            }
        ]);

        const countMap = {};
        pdfCounts.forEach((item) => {
            countMap[item._id.toString()] = {
                pdfCount: item.count,
                totalSize: item.totalSize
            };
        });

        const usersWithStats = users.map((u) => ({
            id: u._id,
            name: u.name,
            pin: u.pin,
            role: u.role,
            isBootstrap: u.role === "admin" && u.pin === (process.env.ADMIN_PIN || "9275"),
            createdAt: u.createdAt,
            pdfCount: countMap[u._id.toString()]?.pdfCount || 0,
            totalSize: countMap[u._id.toString()]?.totalSize || 0
        }));

        res.json({ users: usersWithStats });
    } catch (error) {
        console.error("Admin fetch users error:", error);
        res.status(500).json({ message: "Failed to load users list." });
    }
});

/**
 * POST /api/admin/users
 * Create a new user with Name and automatically generated 4-digit PIN.
 */
router.post("/users", async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                message: "User name is required."
            });
        }

        const cleanName = name.trim();
        const generatedPin = await generateUniquePin();

        const newUser = await User.create({
            name: cleanName,
            pin: generatedPin,
            role: "user"
        });

        // Log admin movement
        logActivity({
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: "admin@drive.local",
            action: "ADMIN_CREATE_USER",
            details: {
                createdUserId: newUser._id,
                createdUserName: newUser.name,
                assignedPin: generatedPin
            },
            req
        });

        res.status(201).json({
            message: `User '${cleanName}' created successfully with PIN: ${generatedPin}`,
            user: {
                id: newUser._id,
                name: newUser.name,
                pin: generatedPin,
                role: newUser.role,
                createdAt: newUser.createdAt,
                pdfCount: 0,
                totalSize: 0
            }
        });

    } catch (error) {
        console.error("Admin create user error:", error);
        res.status(500).json({ message: "Failed to create user." });
    }
});

/**
 * POST /api/admin/administrators
 * Create an additional administrator with a unique 4-digit PIN.
 */
router.post("/administrators", async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "Administrator name is required." });
        }

        const cleanName = name.trim();
        const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
        const generatedPin = await generateUniquePin();

        const newAdmin = await User.create({
            name: cleanName,
            email: cleanEmail,
            pin: generatedPin,
            role: "admin"
        });

        logActivity({
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: "admin@drive.local",
            action: "ADMIN_CREATE_ADMIN",
            details: {
                createdAdminId: newAdmin._id,
                createdAdminName: newAdmin.name,
                assignedPin: generatedPin
            },
            req
        });

        res.status(201).json({
            message: `Administrator '${cleanName}' created successfully with PIN: ${generatedPin}`,
            administrator: {
                id: newAdmin._id,
                name: newAdmin.name,
                email: newAdmin.email,
                pin: generatedPin,
                role: newAdmin.role,
                createdAt: newAdmin.createdAt
            }
        });
    } catch (error) {
        console.error("Admin create administrator error:", error);
        res.status(500).json({ message: "Failed to create administrator." });
    }
});

/**
 * PUT /api/admin/users/:id/regenerate-pin
 * Regenerate (change password) 4-digit PIN for a user.
 */
router.put("/users/:id/regenerate-pin", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (user.role === "admin" && user.pin === (process.env.ADMIN_PIN || "9275")) {
            return res.status(400).json({ message: "The bootstrap Administrator PIN is controlled by the server configuration." });
        }

        const newPin = await generateUniquePin();
        const oldPin = user.pin;
        user.pin = newPin;
        await user.save();

        // Log movement
        logActivity({
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: "admin@drive.local",
            action: user.role === "admin" ? "ADMIN_REGENERATE_ADMIN_PIN" : "ADMIN_REGENERATE_PIN",
            details: {
                targetUserId: user._id,
                targetUserName: user.name,
                oldPin,
                newPin
            },
            req
        });

        res.json({
            message: `New PIN for '${user.name}' is ${newPin}`,
            newPin,
            userId: user._id
        });

    } catch (error) {
        console.error("Admin regenerate PIN error:", error);
        res.status(500).json({ message: "Failed to regenerate PIN." });
    }
});

/**
 * DELETE /api/admin/users/:id
 * Delete user and clean up all their uploaded files.
 */
router.delete("/users/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (user.role === "admin") {
            return res.status(400).json({ message: "Cannot delete the Administrator account." });
        }

        // Find all PDFs belonging to this user
        const userPdfs = await PDF.find({ userId: user._id });

        // Clean up files
        for (const pdf of userPdfs) {
            if (pdf.localPath && fs.existsSync(pdf.localPath)) {
                try {
                    fs.unlinkSync(pdf.localPath);
                } catch (e) {
                    console.warn("Could not delete local file:", e.message);
                }
            }
            if (pdf.cloudinaryPublicId && !pdf.cloudinaryPublicId.startsWith("local_")) {
                try {
                    await deletePdfFile(pdf.cloudinaryPublicId);
                } catch (e) {
                    console.warn("Could not delete Cloudinary file:", e.message);
                }
            }
        }

        // Delete PDFs from DB
        await PDF.deleteMany({ userId: user._id });

        // Delete User
        await User.findByIdAndDelete(req.params.id);

        // Log movement
        logActivity({
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: "admin@drive.local",
            action: "ADMIN_DELETE_USER",
            details: {
                deletedUserId: user._id,
                deletedUserName: user.name,
                deletedPdfsCount: userPdfs.length
            },
            req
        });

        res.json({
            message: `User '${user.name}' and ${userPdfs.length} associated files deleted successfully.`
        });

    } catch (error) {
        console.error("Admin delete user error:", error);
        res.status(500).json({ message: "Failed to delete user." });
    }
});

/**
 * GET /api/admin/logs
 * Retrieve all movements of users (audit log trail).
 */
router.get("/logs", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 150;
        const logs = await getRecentLogs(limit);

        res.json({ logs });
    } catch (error) {
        console.error("Admin logs error:", error);
        res.status(500).json({ message: "Failed to fetch activity logs." });
    }
});

module.exports = router;
