const mongoose = require("mongoose");

const folderSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80
        }
    },
    { timestamps: true }
);

folderSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Folder", folderSchema);