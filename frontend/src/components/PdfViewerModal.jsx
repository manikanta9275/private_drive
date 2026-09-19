import { useState, useEffect } from "react";
import api from "../services/api";

function PdfViewerModal({ pdf, onClose }) {
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!pdf) return;

        let activeUrl = null;
        setLoading(true);
        setError("");

        api.get(`/pdfs/${pdf._id}/view`, { responseType: "blob" })
            .then((response) => {
                const blob = new Blob([response.data], {
                    type: pdf.mimeType || response.data.type || "application/pdf"
                });
                activeUrl = window.URL.createObjectURL(blob);
                setBlobUrl(activeUrl);
            })
            .catch((err) => {
                console.error("PDF preview load error:", err);
                setError(
                    err.response?.data?.message ||
                    "Could not load PDF document preview. Please check your network or try downloading."
                );
            })
            .finally(() => {
                setLoading(false);
            });

        return () => {
            if (activeUrl) {
                window.URL.revokeObjectURL(activeUrl);
            }
        };
    }, [pdf]);

    if (!pdf) return null;

    function formatBytes(bytes) {
        if (!bytes) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    function handleDownload() {
        if (!blobUrl) return;

        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = pdf.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    const isImage = pdf.fileType === "image" || pdf.mimeType?.startsWith("image/");

    return (
        <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.65)", zIndex: 1060 }}
        >
            <div className="modal-dialog modal-xl modal-dialog-centered pdf-viewer-dialog" style={{ height: "92vh" }}>
                <div className="modal-content h-100 border-0 shadow-lg d-flex flex-column">
                    {/* Header */}
                    <div className="modal-header bg-dark text-white border-bottom py-2">
                        <div className="d-flex align-items-center text-truncate me-3">
                                    <span className="fs-5 me-2">{pdf.fileType === "image" ? "🖼️" : "📄"}</span>
                            <div className="text-truncate">
                                <h6 className="modal-title fw-bold text-truncate mb-0">
                                    {pdf.fileName}
                                </h6>
                                <small className="text-light-50">
                                    {formatBytes(pdf.fileSize)} • Uploaded on{" "}
                                    {new Date(pdf.createdAt).toLocaleDateString()}
                                </small>
                            </div>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-light d-flex align-items-center gap-1"
                                onClick={handleDownload}
                                disabled={!blobUrl || loading}
                            >
                                <span>⬇️</span> Download
                            </button>

                            {blobUrl && (
                                <a
                                    href={blobUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-sm btn-primary"
                                >
                                    ↗️ New Tab
                                </a>
                            )}

                            <button
                                type="button"
                                className="btn-close btn-close-white ms-2"
                                onClick={onClose}
                                aria-label="Close"
                            />
                        </div>
                    </div>

                    {/* Body */}
                    <div className="modal-body p-0 flex-grow-1 bg-secondary bg-opacity-10 position-relative d-flex align-items-center justify-content-center">
                        {loading && (
                            <div className="text-center p-4">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading PDF document...</span>
                                </div>
                                <p className="text-muted mt-2 mb-0">Rendering PDF preview...</p>
                            </div>
                        )}

                        {error && !loading && (
                            <div className="p-4 text-center" style={{ maxWidth: "550px" }}>
                                <div className="fs-1 mb-2">⚠️</div>
                                <h5 className="fw-semibold text-danger">Unable to preview document</h5>
                                <p className="text-muted small">{error}</p>
                                <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm mt-2"
                                    onClick={() => window.open(pdf.fileUrl, "_blank")}
                                >
                                    Try Direct Cloudinary Link
                                </button>
                            </div>
                        )}

                        {blobUrl && !loading && (isImage ? (
                            <img
                                src={blobUrl}
                                alt={pdf.fileName}
                                className="asset-preview-image"
                            />
                        ) : (
                            <iframe
                                className="pdf-viewer-frame"
                                src={blobUrl}
                                title={pdf.fileName}
                                width="100%"
                                height="100%"
                                style={{ border: "none" }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PdfViewerModal;
