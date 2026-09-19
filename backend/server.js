const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const authRoutes = require("./routes/authRoutes");
const pdfRoutes = require("./routes/pdfRoutes");
const folderRoutes = require("./routes/folderRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// Validate critical environment variables
if (!process.env.MONGODB_URI) {
    console.error("Error: MONGODB_URI is not defined in the environment (.env file).");
    process.exit(1);
}

// Middleware
const configuredClientUrls = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((url) => url.trim().replace(/\/+$/, ""))
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        const normalizedOrigin = origin.replace(/\/+$/, "");
        let isVercelPreview = false;
        let isLocalDevelopment = false;
        try {
            const originUrl = new URL(origin);
            isVercelPreview = originUrl.hostname.endsWith(".vercel.app");
            isLocalDevelopment = ["localhost", "127.0.0.1", "[::1]"].includes(originUrl.hostname);
        } catch {
            isVercelPreview = false;
            isLocalDevelopment = false;
        }

        if (configuredClientUrls.includes(normalizedOrigin) || isVercelPreview || isLocalDevelopment) {
            return callback(null, true);
        }

        return callback(new Error("Origin is not allowed by server CORS policy."));
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "Private PDF Drive API is running"
    });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/pdfs", pdfRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/admin", adminRoutes);

// 404 Route Not Found Handler
app.use((req, res) => {
    res.status(404).json({
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled Server Error:", err);
    res.status(err.status || 500).json({
        message: err.message || "Internal Server Error"
    });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected successfully");

        const server = app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });

        // Graceful shutdown
        process.on("SIGINT", async () => {
            console.log("\nGracefully shutting down server...");
            server.close(async () => {
                await mongoose.connection.close();
                console.log("MongoDB connection closed.");
                process.exit(0);
            });
        });

    } catch (error) {
        console.error("MongoDB connection failed:");
        console.error(error.message || error);
        process.exit(1);
    }
}

startServer();
