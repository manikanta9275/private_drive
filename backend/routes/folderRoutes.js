const express = require("express");
const mongoose = require("mongoose");
const Folder = require("../models/Folder");
const PDF = require("../models/PDF");
const authenticate = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authenticate);

router.get("/", async (req, res) => {
    try {
        const folders = await Folder.find({ userId: req.user.userId }).sort({ name: 1 }).lean();
        const counts = await PDF.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(req.user.userId), folderId: { $ne: null } } },
            { $group: { _id: "$folderId", count: { $sum: 1 } } }
        ]);
        const countMap = Object.fromEntries(counts.map((item) => [item._id.toString(), item.count]));

        res.json({
            folders: folders.map((folder) => ({ ...folder, pdfCount: countMap[folder._id.toString()] || 0 }))
        });
    } catch (error) {
        console.error("Fetch folders error:", error);
        res.status(500).json({ message: "Failed to load folders." });
    }
});

router.post("/", async (req, res) => {
    try {
        const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
        if (!name) return res.status(400).json({ message: "Folder name is required." });

        const folder = await Folder.create({ userId: req.user.userId, name });
        res.status(201).json({ folder: { ...folder.toObject(), pdfCount: 0 } });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "A folder with that name already exists." });
        console.error("Create folder error:", error);
        res.status(500).json({ message: "Failed to create folder." });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const folder = await Folder.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
        if (!folder) return res.status(404).json({ message: "Folder not found." });

        await PDF.updateMany({ userId: req.user.userId, folderId: folder._id }, { $set: { folderId: null } });
        res.json({ message: "Folder deleted. Its files were moved to the root." });
    } catch (error) {
        console.error("Delete folder error:", error);
        res.status(500).json({ message: "Failed to delete folder." });
    }
});

router.patch("/move-file/:id", async (req, res) => {
    try {
        const { folderId } = req.body;
        let nextFolderId = null;

        if (folderId) {
            const folder = await Folder.findOne({ _id: folderId, userId: req.user.userId });
            if (!folder) return res.status(404).json({ message: "Destination folder was not found." });
            nextFolderId = folder._id;
        }

        const file = await PDF.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.userId },
            { $set: { folderId: nextFolderId } },
            { new: true }
        );

        if (!file) return res.status(404).json({ message: "File was not found." });
        res.json({ message: "File moved successfully.", pdf: file });
    } catch (error) {
        console.error("Move file error:", error);
        res.status(500).json({ message: "Failed to move file." });
    }
});

module.exports = router;