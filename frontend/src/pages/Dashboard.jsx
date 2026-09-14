import { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import UploadModal from "../components/UploadModal";
import CreateFolderModal from "../components/CreateFolderModal";
import PdfViewerModal from "../components/PdfViewerModal";
import AdminUsersModal from "../components/AdminUsersModal";
import AdminMovementsModal from "../components/AdminMovementsModal";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function Dashboard() {
    const { user } = useAuth();

    const [pdfs, setPdfs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Filter, search & view state
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'table'

    // Modals
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [previewPdf, setPreviewPdf] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [renameTarget, setRenameTarget] = useState(null);
    const [renameValue, setRenameValue] = useState("");
    const [renaming, setRenaming] = useState(false);
    const [moveTarget, setMoveTarget] = useState(null);
    const [moveFolderId, setMoveFolderId] = useState("");
    const [moving, setMoving] = useState(false);
    const [downloadingId, setDownloadingId] = useState(null);
    const [folders, setFolders] = useState([]);
    const [currentFolderId, setCurrentFolderId] = useState("root");
    const [createFolderOpen, setCreateFolderOpen] = useState(false);

    // Admin modals
    const [adminUsersModalOpen, setAdminUsersModalOpen] = useState(false);
    const [adminMovementsModalOpen, setAdminMovementsModalOpen] = useState(false);

    useEffect(() => {
        fetchPdfs();
    }, [sortBy, currentFolderId]);

    useEffect(() => {
        fetchFolders();
    }, []);

    async function fetchFolders() {
        try {
            const response = await api.get("/folders");
            setFolders(response.data.folders || []);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load folders.");
        }
    }

    async function fetchPdfs() {
        setLoading(true);
        setError("");
        try {
            const response = await api.get(`/pdfs?sortBy=${sortBy}&folderId=${currentFolderId}`);
            setPdfs(response.data.pdfs || []);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load files from your Drive.");
        } finally {
            setLoading(false);
        }
    }

    function handleUploadSuccess(newPdf) {
        setPdfs((prev) => [newPdf, ...prev]);
        setFolders((prev) => prev.map((folder) => folder._id === newPdf.folderId ? { ...folder, pdfCount: folder.pdfCount + 1 } : folder));
    }

    function handleFolderCreated(folder) {
        setFolders((prev) => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name)));
        setCurrentFolderId(folder._id);
    }

    async function handleFolderDelete(folder) {
        if (!window.confirm(`Delete the folder "${folder.name}"? Its files will move to the root.`)) return;
        try {
            await api.delete(`/folders/${folder._id}`);
            setFolders((prev) => prev.filter((item) => item._id !== folder._id));
            if (currentFolderId === folder._id) setCurrentFolderId("root");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete folder.");
        }
    }

    async function handleDownload(pdf) {
        setDownloadingId(pdf._id);
        try {
            const response = await api.get(`/pdfs/${pdf._id}/download`, {
                responseType: "blob"
            });
            const blob = new Blob([response.data], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = pdf.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download failed:", err);
            alert(err.response?.data?.message || "Failed to download PDF. Please check your connection.");
        } finally {
            setDownloadingId(null);
        }
    }

    async function confirmDelete() {
        if (!deleteTarget) return;

        setDeleting(true);
        try {
            await api.delete(`/pdfs/${deleteTarget._id}`);
            setPdfs((prev) => prev.filter((p) => p._id !== deleteTarget._id));
            setDeleteTarget(null);
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete file.");
        } finally {
            setDeleting(false);
        }
    }

    function openRename(pdf) {
        setRenameTarget(pdf);
        setRenameValue(pdf.fileName.replace(/\.pdf$/i, ""));
    }

    async function confirmRename(event) {
        event.preventDefault();
        const trimmedName = renameValue.trim();
        if (!renameTarget || !trimmedName) return;

        setRenaming(true);
        try {
            const response = await api.patch(`/pdfs/${renameTarget._id}/name`, {
                fileName: trimmedName
            });
            setPdfs((prev) => prev.map((pdf) => (
                pdf._id === renameTarget._id ? response.data.pdf : pdf
            )));
            setRenameTarget(null);
        } catch (err) {
            alert(err.response?.data?.message || "Failed to rename PDF file.");
        } finally {
            setRenaming(false);
        }
    }

    function openMove(pdf) {
        setMoveTarget(pdf);
        setMoveFolderId(pdf.folderId || "");
    }

    async function confirmMove(event) {
        event.preventDefault();
        if (!moveTarget) return;

        const previousFolderId = moveTarget.folderId || null;
        const nextFolderId = moveFolderId || null;
        if (previousFolderId === nextFolderId) {
            setMoveTarget(null);
            return;
        }

        setMoving(true);
        try {
            const response = await api.patch(`/folders/move-file/${moveTarget._id}`, {
                folderId: nextFolderId
            });
            setPdfs((prev) => prev.filter((pdf) => pdf._id !== moveTarget._id));
            setFolders((prev) => prev.map((folder) => {
                if (folder._id === previousFolderId) return { ...folder, pdfCount: Math.max(0, (folder.pdfCount || 0) - 1) };
                if (folder._id === nextFolderId) return { ...folder, pdfCount: (folder.pdfCount || 0) + 1 };
                return folder;
            }));
            setMoveTarget(null);
            if (currentFolderId === "root" && nextFolderId === null) {
                setPdfs((prev) => [response.data.pdf, ...prev]);
            }
            if (currentFolderId !== "root" && currentFolderId === nextFolderId) {
                setPdfs((prev) => [response.data.pdf, ...prev]);
            }
        } catch (err) {
            alert(err.response?.data?.message || "Failed to move file.");
        } finally {
            setMoving(false);
        }
    }

    function formatBytes(bytes) {
        if (!bytes) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    // Filter PDFs by search term
    const filteredPdfs = useMemo(() => {
        if (!searchTerm.trim()) return pdfs;
        return pdfs.filter((p) =>
            p.fileName.toLowerCase().includes(searchTerm.toLowerCase().trim())
        );
    }, [pdfs, searchTerm]);

    const totalStorage = useMemo(() => {
        return pdfs.reduce((acc, curr) => acc + (curr.fileSize || 0), 0);
    }, [pdfs]);

    const isAdmin = user?.role === "admin";
    const currentFolder = folders.find((folder) => folder._id === currentFolderId);

    return (
        <div className="app-shell bg-light d-flex flex-column">
            <Navbar />

            <div className="container py-4 flex-grow-1">
                {/* Admin Management Action Bar (visible only to Administrator) */}
                {isAdmin && (
                    <div className="admin-control-panel mb-4">
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                            <div>
                                <div className="d-flex align-items-center gap-2 mb-1">
                                    <span className="admin-eyebrow">SECURE ADMIN CONSOLE</span>
                                    <span className="admin-status"><span /> Control access enabled</span>
                                </div>
                                <h3 className="admin-panel-title">Administrator Controls</h3>
                                <p className="admin-panel-copy">
                                    Create users with 4-digit PINs, regenerate PINs, delete accounts, and monitor all user movements.
                                </p>
                            </div>

                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    className="btn admin-action-primary btn-sm fw-bold d-flex align-items-center gap-1 px-3 py-2"
                                    onClick={() => setAdminUsersModalOpen(true)}
                                >
                                    <span>👥</span> Users & 4-Digit PINs
                                </button>

                                <button
                                    type="button"
                                    className="btn admin-action-secondary btn-sm fw-semibold d-flex align-items-center gap-1 px-3 py-2"
                                    onClick={() => setAdminMovementsModalOpen(true)}
                                >
                                    <span>📋</span> User Movements
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header & Storage Overview */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center pb-3 mb-4 border-bottom gap-3">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                            {currentFolderId !== "root" && (
                                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentFolderId("root")} title="Back to My PDF Drive">←</button>
                            )}
                            <h2 className="fw-bold mb-0">
                                {currentFolderId === "root" ? "📁 My Drive" : `📂 ${currentFolder?.name || "Folder"}`}
                            </h2>
                        </div>
                        <p className="text-muted mb-0">
                            {currentFolderId === "root"
                                ? <>
                                    Welcome back,{" "}
                                    <span className="fw-bold text-dark fs-5 text-uppercase">
                                        {user?.name}
                                    </span>.
                                </>
                                : "Upload and manage the PDF documents in this folder."}
                        </p>
                    </div>

                    <div className="dashboard-actions">
                        <div className="dashboard-primary-actions">
                        {currentFolderId === "root" && (
                            <button type="button" className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={() => setCreateFolderOpen(true)} title="Create folder">
                                <span>📁</span> Create folder
                            </button>
                        )}
                        <button
                            type="button"
                            className="btn btn-primary d-flex align-items-center gap-2 shadow-sm px-4"
                            onClick={() => setUploadModalOpen(true)}
                        >
                            <span>➕</span> Upload PDF
                        </button>
                        </div>
                        <div className="text-md-end">
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded-pill fs-6 fw-normal">
                                📊 {pdfs.length} {pdfs.length === 1 ? "file" : "files"} • {formatBytes(totalStorage)} used
                            </span>
                        </div>
                    </div>
                </div>

                {/* Search & Sort Toolbar */}
                <div className="card shadow-sm border-0 mb-4">
                    <div className="card-body p-3">
                        <div className="row g-2 align-items-center">
                            {/* Search Input */}
                            <div className="col-12 col-md-6">
                                <div className="input-group">
                                    <span className="input-group-text bg-white border-end-0 text-muted">
                                        🔍
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control border-start-0 ps-0"
                                        placeholder="Search your PDF files by name..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary border-start-0"
                                            onClick={() => setSearchTerm("")}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Sort Selector */}
                            <div className="col-6 col-md-4">
                                <div className="input-group">
                                    <span className="input-group-text bg-white text-muted small">
                                        Sort by
                                    </span>
                                    <select
                                        className="form-select"
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                    >
                                        <option value="newest">Newest First</option>
                                        <option value="oldest">Oldest First</option>
                                        <option value="name_asc">Name (A - Z)</option>
                                        <option value="name_desc">Name (Z - A)</option>
                                        <option value="size_desc">Size (Largest)</option>
                                        <option value="size_asc">Size (Smallest)</option>
                                    </select>
                                </div>
                            </div>

                            {/* View Switcher Toggle */}
                            <div className="col-6 col-md-2 text-end">
                                <div className="btn-group w-100" role="group">
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${viewMode === "grid" ? "btn-dark" : "btn-outline-secondary"}`}
                                        onClick={() => setViewMode("grid")}
                                        title="Grid View"
                                    >
                                        ▦ Grid
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${viewMode === "table" ? "btn-dark" : "btn-outline-secondary"}`}
                                        onClick={() => setViewMode("table")}
                                        title="List View"
                                    >
                                        ☰ List
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="alert alert-danger shadow-sm py-2" role="alert">
                        {error}
                    </div>
                )}

                <div className="drive-layout">
                    <aside className="folder-sidebar" aria-label="PDF folders">
                        <div className="folder-sidebar-heading">
                            <div>
                                <p className="text-uppercase small fw-bold text-primary mb-1">Your library</p>
                                <h5 className="fw-bold mb-0">Folders</h5>
                            </div>
                            <span className="folder-count">{folders.length}</span>
                        </div>

                        <div className="folder-list">
                            <button
                                type="button"
                                className={`folder-nav-item ${currentFolderId === "root" ? "active" : ""}`}
                                onClick={() => setCurrentFolderId("root")}
                            >
                                <span className="folder-nav-icon">⌂</span>
                                <span className="text-truncate">My PDF Drive</span>
                                {currentFolderId === "root" && <span className="folder-active-dot" />}
                            </button>

                            {folders.map((folder) => (
                                <div className="folder-nav-row" key={folder._id}>
                                    <button
                                        type="button"
                                        className={`folder-nav-item ${currentFolderId === folder._id ? "active" : ""}`}
                                        onClick={() => setCurrentFolderId(folder._id)}
                                    >
                                        <span className="folder-nav-icon">📁</span>
                                        <span className="text-truncate">{folder.name}</span>
                                        <span className="folder-file-count">{folder.pdfCount || 0}</span>
                                    </button>
                                    {currentFolderId === folder._id && (
                                        <button
                                            type="button"
                                            className="folder-delete-button"
                                            onClick={() => handleFolderDelete(folder)}
                                            title={`Delete ${folder.name}`}
                                            aria-label={`Delete ${folder.name}`}
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {folders.length === 0 && (
                            <p className="folder-empty-note">Create a folder to organize your PDFs.</p>
                        )}
                    </aside>

                    <section className="drive-content" aria-live="polite">
                        {/* Content Area */}
                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading files...</span>
                                </div>
                                <p className="text-muted mt-3">Accessing your Drive...</p>
                            </div>
                        ) : filteredPdfs.length === 0 ? (
                    <div className="card shadow-sm border-0 py-5 text-center bg-white">
                        <div className="card-body">
                            <div className="display-4 text-muted mb-3">📄</div>
                            {searchTerm ? (
                                <>
                                    <h5 className="fw-semibold">No files match "{searchTerm}"</h5>
                                    <p className="text-muted">Try clearing your search query to see all your documents.</p>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() => setSearchTerm("")}
                                    >
                                        Clear Search
                                    </button>
                                </>
                            ) : (
                                <>
                                    <h5 className="fw-semibold">Your Drive is empty</h5>
                                    <p className="text-muted">Upload your first PDF document to keep it safe and accessible anywhere.</p>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => setUploadModalOpen(true)}
                                    >
                                        Upload PDF Now
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    ) : viewMode === "grid" ? (
                    /* GRID VIEW */
                    <div className="row g-3">
                        {filteredPdfs.map((pdf) => (
                            <div key={pdf._id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                                <div className="card h-100 shadow-sm border-0 file-card hover-shadow transition">
                                    <div
                                        className="card-body p-3 d-flex flex-column cursor-pointer"
                                        onClick={() => setPreviewPdf(pdf)}
                                        style={{ cursor: "pointer" }}
                                    >
                                        {/* Icon Header */}
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div
                                                className="bg-danger-subtle text-danger p-2 rounded d-flex align-items-center justify-content-center"
                                                style={{ width: "42px", height: "42px" }}
                                            >
                                                <span className="fs-5">{pdf.fileType === "image" ? "🖼️" : "📑"}</span>
                                            </div>
                                            <span className="badge bg-light text-secondary border">
                                                {formatBytes(pdf.fileSize)}
                                            </span>
                                        </div>

                                        {pdf.fileType === "image" && (
                                            <div className="file-card-image-placeholder mb-3">
                                                <span>🖼️ Image preview</span>
                                            </div>
                                        )}

                                        {/* File Name */}
                                        <h6
                                            className="card-title fw-semibold text-truncate mb-1"
                                            title={pdf.fileName}
                                        >
                                            {pdf.fileName}
                                        </h6>

                                        {/* Upload Date */}
                                        <small className="text-muted mb-3">
                                            {new Date(pdf.createdAt).toLocaleDateString(undefined, {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric"
                                            })}
                                        </small>

                                        {/* Actions */}
                                        <div
                                            className="mt-auto pt-2 border-top d-flex justify-content-between gap-1"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-primary flex-grow-1"
                                                onClick={() => setPreviewPdf(pdf)}
                                            >
                                                Preview
                                            </button>

                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-secondary px-2"
                                                title="Download PDF"
                                                disabled={downloadingId === pdf._id}
                                                onClick={() => handleDownload(pdf)}
                                            >
                                                {downloadingId === pdf._id ? "⏳" : "⬇️"}
                                            </button>

                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-dark px-2"
                                                title="Rename PDF"
                                                onClick={() => openRename(pdf)}
                                            >
                                                ✎
                                            </button>

                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-primary px-2"
                                                title="Move to folder"
                                                onClick={() => openMove(pdf)}
                                            >
                                                ↗
                                            </button>

                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger px-2"
                                                title="Delete PDF"
                                                onClick={() => setDeleteTarget(pdf)}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* TABLE VIEW */
                    <div className="card shadow-sm border-0 overflow-hidden">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th scope="col" style={{ width: "45%" }}>Name</th>
                                        <th scope="col" style={{ width: "15%" }}>Size</th>
                                        <th scope="col" style={{ width: "20%" }}>Uploaded</th>
                                        <th scope="col" className="text-end" style={{ width: "20%" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPdfs.map((pdf) => (
                                        <tr key={pdf._id}>
                                            <td>
                                                <div
                                                    className="d-flex align-items-center cursor-pointer"
                                                    onClick={() => setPreviewPdf(pdf)}
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    <span className="fs-5 text-danger me-2">{pdf.fileType === "image" ? "🖼️" : "📑"}</span>
                                                    <span className="fw-medium text-truncate" title={pdf.fileName}>
                                                        {pdf.fileName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="text-muted small">
                                                {formatBytes(pdf.fileSize)}
                                            </td>
                                            <td className="text-muted small">
                                                {new Date(pdf.createdAt).toLocaleString(undefined, {
                                                    dateStyle: "medium",
                                                    timeStyle: "short"
                                                })}
                                            </td>
                                            <td className="text-end">
                                                <div className="btn-group btn-group-sm">
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-primary"
                                                        onClick={() => setPreviewPdf(pdf)}
                                                    >
                                                        Preview
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-secondary"
                                                        title="Download"
                                                        disabled={downloadingId === pdf._id}
                                                        onClick={() => handleDownload(pdf)}
                                                    >
                                                        {downloadingId === pdf._id ? "⏳" : "⬇️"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-dark"
                                                        title="Rename PDF"
                                                        onClick={() => openRename(pdf)}
                                                    >
                                                        ✎
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-primary"
                                                        title="Move to folder"
                                                        onClick={() => openMove(pdf)}
                                                    >
                                                        ↗
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-danger"
                                                        title="Delete"
                                                        onClick={() => setDeleteTarget(pdf)}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                        )}
                    </section>
                </div>
            </div>

            {/* Upload Modal */}
            <UploadModal
                isOpen={uploadModalOpen}
                onClose={() => setUploadModalOpen(false)}
                onUploadSuccess={handleUploadSuccess}
                folders={folders}
                selectedFolderId={currentFolderId === "root" ? null : currentFolderId}
            />

            <CreateFolderModal
                isOpen={createFolderOpen}
                onClose={() => setCreateFolderOpen(false)}
                onCreated={handleFolderCreated}
            />

            {/* PDF Viewer Modal */}
            <PdfViewerModal
                pdf={previewPdf}
                onClose={() => setPreviewPdf(null)}
            />

            {moveTarget && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(10, 25, 41, 0.62)", zIndex: 1065 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <form className="modal-content border-0 shadow-lg" onSubmit={confirmMove}>
                            <div className="modal-header rename-modal-header">
                                <div>
                                    <p className="text-uppercase small fw-bold text-primary mb-1">Organize file</p>
                                    <h5 className="modal-title fw-bold mb-0">Move file</h5>
                                </div>
                                <button type="button" className="btn-close" onClick={() => setMoveTarget(null)} disabled={moving} aria-label="Close move dialog" />
                            </div>
                            <div className="modal-body p-4">
                                <p className="small text-muted mb-3 text-truncate" title={moveTarget.fileName}>{moveTarget.fileName}</p>
                                <label htmlFor="move-folder" className="form-label fw-semibold">Destination folder</label>
                                <select id="move-folder" className="form-select form-select-lg" value={moveFolderId} onChange={(event) => setMoveFolderId(event.target.value)} disabled={moving}>
                                    <option value="">My PDF Drive (root)</option>
                                    {folders.map((folder) => <option key={folder._id} value={folder._id}>{folder.name}</option>)}
                                </select>
                            </div>
                            <div className="modal-footer bg-light">
                                <button type="button" className="btn btn-light border" onClick={() => setMoveTarget(null)} disabled={moving}>Cancel</button>
                                <button type="submit" className="btn btn-primary px-4" disabled={moving}>{moving ? "Moving..." : "Move file"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Admin Users & PINs Modal */}
            <AdminUsersModal
                isOpen={adminUsersModalOpen}
                onClose={() => setAdminUsersModalOpen(false)}
            />

            {/* Admin Movements Modal */}
            <AdminMovementsModal
                isOpen={adminMovementsModalOpen}
                onClose={() => setAdminMovementsModalOpen(false)}
            />

            {renameTarget && (
                <div
                    className="modal show d-block"
                    tabIndex="-1"
                    style={{ backgroundColor: "rgba(10, 25, 41, 0.62)", zIndex: 1065 }}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <form className="modal-content border-0 shadow-lg" onSubmit={confirmRename}>
                            <div className="modal-header rename-modal-header">
                                <div>
                                    <p className="text-uppercase small fw-bold text-primary mb-1">File details</p>
                                    <h5 className="modal-title fw-bold mb-0">Rename PDF</h5>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setRenameTarget(null)}
                                    disabled={renaming}
                                    aria-label="Close rename dialog"
                                />
                            </div>
                            <div className="modal-body p-4">
                                <label htmlFor="rename-pdf-name" className="form-label fw-semibold">New PDF name</label>
                                <div className="input-group input-group-lg">
                                    <input
                                        id="rename-pdf-name"
                                        type="text"
                                        className="form-control"
                                        value={renameValue}
                                        onChange={(event) => setRenameValue(event.target.value.replace(/\.pdf$/i, ""))}
                                        maxLength={120}
                                        autoFocus
                                        disabled={renaming}
                                    />
                                    <span className="input-group-text">.pdf</span>
                                </div>
                                <p className="small text-muted mt-2 mb-0">The PDF contents stay unchanged. Only its drive name is updated.</p>
                            </div>
                            <div className="modal-footer bg-light">
                                <button
                                    type="button"
                                    className="btn btn-light border"
                                    onClick={() => setRenameTarget(null)}
                                    disabled={renaming}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary px-4" disabled={renaming || !renameValue.trim()}>
                                    {renaming ? "Saving..." : "Save name"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div
                    className="modal show d-block"
                    tabIndex="-1"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1070 }}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header">
                                <h5 className="modal-title fw-bold text-danger">
                                    🗑️ Confirm Delete
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setDeleteTarget(null)}
                                    disabled={deleting}
                                />
                            </div>
                            <div className="modal-body">
                                <p className="mb-1">
                                    Are you sure you want to permanently delete:
                                </p>
                                <p className="fw-bold text-dark text-truncate my-2 p-2 bg-light rounded border">
                                    {deleteTarget.fileName}
                                </p>
                                <small className="text-muted">
                                    This will remove the file from your Drive and delete it from cloud storage. This action cannot be undone.
                                </small>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setDeleteTarget(null)}
                                    disabled={deleting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={confirmDelete}
                                    disabled={deleting}
                                >
                                    {deleting ? "Deleting..." : "Delete Permanently"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
