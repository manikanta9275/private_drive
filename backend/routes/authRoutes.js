const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { logActivity } = require("../services/activityLogger");

const router = express.Router();
const ADMIN_NAME = "Manikanta sir";

/**
 * Helper to get or create the Administrator account
 */
async function getOrCreateAdmin(adminPin) {
    let admin = await User.findOne({ role: "admin" });
    if (!admin) {
        admin = await User.create({
            name: ADMIN_NAME,
            pin: adminPin,
            role: "admin",
            email: "admin@drive.local"
        });
        console.log("Created initial Administrator account with PIN:", adminPin);
    } else if (admin.pin !== adminPin || admin.name !== ADMIN_NAME) {
        admin.pin = adminPin;
        admin.name = ADMIN_NAME;
        await admin.save();
    }
    return admin;
}

/**
 * POST /api/auth/pin-login
 * Single 4-digit PIN login for Administrator and generated Users.
 */
router.post("/pin-login", async (req, res) => {
    try {
        const { pin } = req.body;

        if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin.trim())) {
            return res.status(400).json({
                message: "Please enter a valid 4-digit PIN."
            });
        }

        const cleanPin = pin.trim();
        const configuredAdminPin = process.env.ADMIN_PIN || "9275";

        // Check if Admin PIN
        if (cleanPin === configuredAdminPin) {
            const adminUser = await getOrCreateAdmin(configuredAdminPin);

            const token = jwt.sign(
                {
                    userId: adminUser._id,
                    name: adminUser.name,
                    role: "admin"
                },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            logActivity({
                userId: adminUser._id,
                userName: adminUser.name,
                userEmail: "admin@drive.local",
                action: "USER_LOGIN",
                details: { role: "admin" },
                req
            });

            return res.json({
                message: "Admin login successful",
                token,
                user: {
                    id: adminUser._id,
                    name: adminUser.name,
                    role: "admin"
                }
            });
        }

        // Check if Regular User PIN
        const user = await User.findOne({ pin: cleanPin });

        if (!user) {
            return res.status(401).json({
                message: "Invalid 4-digit PIN. Access denied."
            });
        }

        const token = jwt.sign(
            {
                userId: user._id,
                name: user.name,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        logActivity({
            userId: user._id,
            userName: user.name,
            userEmail: user.email || "N/A",
            action: "USER_LOGIN",
            details: { role: user.role },
            req
        });

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error("PIN login error:", error);
        res.status(500).json({
            message: "Authentication failed. Please try again."
        });
    }
});

module.exports = router;
