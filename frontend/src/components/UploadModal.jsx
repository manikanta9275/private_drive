import { useState, useRef, useEffect } from "react";
import api from "../services/api";

function UploadModal({ isOpen, onClose, onUploadSuccess, folders = [], selectedFolderId = null }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const [folderId, setFolderId] = useState(selectedFolderId || "");
    const [fileName, setFileName] = useState("");
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setFolderId(selectedFolderId || "");
            setFileName("");
        }
    }, [isOpen, selectedFolderId]);

    if (!isOpen) return null;

    function validateAndSetFile(file) {
        setError("");

        if (!file) return;

        const supportedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        const isImage = supportedImageTypes.includes(file.type);
        if (!isPdf && !isImage) {
            setError("Invalid file format. Use PDF, JPG, PNG, GIF, or WEBP files.");
            setSelectedFile(null);
            return;
        }

        const maxSizeBytes = 15 * 1024 * 1024; // 15 MB
        if (file.size > maxSizeBytes) {
            setError("File size exceeds 15 MB limit. Please select a smaller PDF.");
            setSelectedFile(null);
            return;
        }

        setSelectedFile(file);
        setFileName(file.name.replace(/\.(pdf|jpe?g|png|gif|webp)$/i, ""));
    }

    function handleFileChange(e) {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    }

    async function handleUpload() {
        if (!selectedFile) {
            setError("Please select a PDF file to upload.");
            return;
        }

        setUploading(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append("pdf", selectedFile);
            formData.append("fileName", fileName.trim());
            if (folderId) formData.append("folderId", folderId);

            const response = await api.post("/pdfs/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });

            setSelectedFile(null);
            onUploadSuccess(response.data.pdf);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to upload file. Please try again.");
        } finally {
            setUploading(false);
        }
    }

    function formatBytes(bytes) {
        if (!bytes) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    return (
        <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
        >
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header border-bottom">
                        <h5 className="modal-title fw-bold">
                            📤 Upload File
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={onClose}
                            disabled={uploading}
                            aria-label="Close"
                        />
                    </div>

                    <div className="modal-body p-4">
                        {error && (
                            <div className="alert alert-danger py-2 small" role="alert">
                                {error}
                            </div>
                        )}

                        {folders.length > 0 && (
                            <div className="mb-3">
                                <label htmlFor="upload-folder" className="form-label small fw-semibold">Save in folder</label>
                                <select
                                    id="upload-folder"
                                    className="form-select"
                                    value={folderId}
                                    onChange={(e) => setFolderId(e.target.value)}
                                    disabled={uploading}
                                >
                                    <option value="">Root (no folder)</option>
                                    {folders.map((folder) => (
                                        <option key={folder._id} value={folder._id}>{folder.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="mb-3">
                            <label htmlFor="upload-file-name" className="form-label small fw-semibold">File name</label>
                            <div className="input-group">
                                <input
                                    id="upload-file-name"
                                    type="text"
                                    className="form-control"
                                    value={fileName}
                                    onChange={(e) => setFileName(e.target.value.replace(/\.pdf$/i, ""))}
                                    placeholder="Enter a name for this PDF"
                                    maxLength={120}
                                    disabled={uploading}
                                />
                                <span className="input-group-text">.pdf</span>
                            </div>
                            <div className="form-text">Choose a clear name before it is added to your drive.</div>
                        </div>

                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => !uploading && fileInputRef.current?.click()}
                            style={{
                                border: `2px dashed ${dragActive ? "#0d6efd" : "#ced4da"}`,
                                borderRadius: "10px",
                                backgroundColor: dragActive ? "#f0f7ff" : "#fafafa",
                                padding: "35px 20px",
                                textAlign: "center",
                                cursor: uploading ? "not-allowed" : "pointer",
                                transition: "all 0.2s ease"
                            }}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,application/pdf,.jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                                onChange={handleFileChange}
                                style={{ display: "none" }}
                                disabled={uploading}
                            />

                            <div className="display-4 text-primary mb-2">
                                ☁️
                            </div>

                            <p className="fw-semibold mb-1">
                                Drag & drop your PDF file here, or{" "}
                                <span className="text-primary text-decoration-underline">
                                    browse files
                                </span>
                            </p>
                            <small className="text-muted">
                                PDF and image files up to 15 MB are supported.
                            </small>
                        </div>

                        {selectedFile && (
                            <div className="mt-3 p-3 bg-light rounded border d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center text-truncate me-2">
                                    <span className="fs-4 me-2">📑</span>
                                    <div className="text-truncate">
                                        <p className="mb-0 fw-medium text-truncate small">
                                            {selectedFile.name}
                                        </p>
                                        <small className="text-muted">
                                            {formatBytes(selectedFile.size)}
                                        </small>
                                    </div>
                                </div>
                                {!uploading && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedFile(null);
                                        }}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        )}

                        {uploading && (
                            <div className="mt-3">
                                <div className="progress" style={{ height: "8px" }}>
                                    <div
                                        className="progress-bar progress-bar-striped progress-bar-animated"
                                        style={{ width: "100%" }}
                                    />
                                </div>
                                <small className="text-muted d-block text-center mt-2">
                                    Uploading and securing your PDF in Cloudinary...
                                </small>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer border-top bg-light">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={uploading}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleUpload}
                            disabled={!selectedFile || uploading}
                        >
                            {uploading ? "Uploading..." : "Upload to Drive"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UploadModal;

