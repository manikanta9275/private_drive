import { useEffect } from "react";

function MobileDrawer({
    isOpen,
    onClose,
    user,
    onLogout,
    folders = [],
    currentFolderId,
    onSelectFolder,
    onDeleteFolder,
    onCreateFolder,
    onUpload,
    isAdmin,
    onOpenAdminUsers,
    onOpenAdminMovements,
    totalStorage = 0,
    filesCount = 0,
    formatBytes,
    sortBy,
    onSortChange,
    viewMode,
    onViewModeChange
}) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            const handleKeyDown = (e) => {
                if (e.key === "Escape") onClose();
            };
            window.addEventListener("keydown", handleKeyDown);
            return () => {
                document.body.style.overflow = "";
                window.removeEventListener("keydown", handleKeyDown);
            };
        } else {
            document.body.style.overflow = "";
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : "U";

    return (
        <div className="mobile-drawer-wrapper" role="dialog" aria-modal="true" aria-label="Mobile Navigation Menu">
            {/* Backdrop */}
            <div
                className="mobile-drawer-backdrop"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Slide-out Sidebar Panel */}
            <aside className="mobile-drawer-panel">
                {/* Header */}
                <div className="mobile-drawer-header">
                    <div className="d-flex align-items-center gap-2">
                        <span className="fs-4">📁</span>
                        <div>
                            <h6 className="fw-bold text-light mb-0">Private Drive</h6>
                            <small className="text-muted" style={{ fontSize: "0.72rem" }}>Secure Cloud Storage</small>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn-close btn-close-white mobile-drawer-close"
                        onClick={onClose}
                        aria-label="Close menu"
                    />
                </div>

                <div className="mobile-drawer-body">
                    {/* User Profile Card */}
                    <div className="mobile-drawer-user-card mb-3">
                        <div className="d-flex align-items-center gap-3">
                            <div className="mobile-drawer-avatar">
                                {userInitial}
                            </div>
                            <div className="text-truncate flex-grow-1">
                                <div className="fw-bold text-light text-truncate mb-0">
                                    {user?.name || "User"}
                                </div>
                                <div className="d-flex align-items-center gap-2 mt-1">
                                    {isAdmin ? (
                                        <span className="badge bg-danger text-uppercase px-2 py-0" style={{ fontSize: "9px" }}>
                                            Administrator
                                        </span>
                                    ) : (
                                        <span className="badge bg-secondary text-uppercase px-2 py-0" style={{ fontSize: "9px" }}>
                                            Member
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Storage Pill */}
                        <div className="mobile-drawer-storage-bar mt-2 pt-2 border-top border-secondary border-opacity-25">
                            <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                                📊 <strong>{filesCount}</strong> {filesCount === 1 ? "file" : "files"} • <strong>{formatBytes ? formatBytes(totalStorage) : `${totalStorage} Bytes`}</strong> used
                            </span>
                        </div>
                    </div>

                    {/* Quick Operations / Actions */}
                    <div className="mobile-drawer-section mb-3">
                        <div className="mobile-drawer-section-title">Operations</div>
                        <div className="d-grid gap-2">
                            <button
                                type="button"
                                className="btn btn-primary d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
                                onClick={() => {
                                    onClose();
                                    onUpload();
                                }}
                            >
                                <span>➕</span> Upload PDF / File
                            </button>

                            <button
                                type="button"
                                className="btn btn-outline-info d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
                                onClick={() => {
                                    onClose();
                                    onCreateFolder();
                                }}
                            >
                                <span>📁</span> Create New Folder
                            </button>
                        </div>
                    </div>

                    {/* Administrator Operations (if Admin) */}
                    {isAdmin && (
                        <div className="mobile-drawer-section mobile-drawer-admin-section mb-3 p-3 rounded">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <span className="mobile-drawer-section-title mb-0 text-warning">
                                    🛡️ Admin Controls
                                </span>
                                <span className="badge bg-warning text-dark px-2" style={{ fontSize: "10px" }}>Active</span>
                            </div>
                            <div className="d-grid gap-2">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-admin d-flex align-items-center justify-content-center gap-2 py-2 fw-bold"
                                    onClick={() => {
                                        onClose();
                                        onOpenAdminUsers();
                                    }}
                                >
                                    <span>👥</span> Users & 4-Digit PINs
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-light d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
                                    onClick={() => {
                                        onClose();
                                        onOpenAdminMovements();
                                    }}
                                >
                                    <span>📋</span> User Movements & Logs
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Library & Folders Section */}
                    <div className="mobile-drawer-section mb-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <div className="mobile-drawer-section-title mb-0">
                                📂 Folders & Library
                            </div>
                            <span className="badge bg-secondary-subtle text-light px-2" style={{ fontSize: "10px" }}>
                                {folders.length + 1}
                            </span>
                        </div>

                        <div className="mobile-drawer-folders-list">
                            {/* Root Drive */}
                            <button
                                type="button"
                                className={`mobile-drawer-folder-item ${currentFolderId === "root" ? "active" : ""}`}
                                onClick={() => {
                                    onSelectFolder("root");
                                    onClose();
                                }}
                            >
                                <span className="mobile-drawer-folder-icon">⌂</span>
                                <span className="text-truncate flex-grow-1">My PDF Drive (All)</span>
                                {currentFolderId === "root" && <span className="mobile-drawer-active-dot" />}
                            </button>

                            {/* User Folders */}
                            {folders.map((folder) => (
                                <div className="mobile-drawer-folder-row" key={folder._id}>
                                    <button
                                        type="button"
                                        className={`mobile-drawer-folder-item ${currentFolderId === folder._id ? "active" : ""}`}
                                        onClick={() => {
                                            onSelectFolder(folder._id);
                                            onClose();
                                        }}
                                    >
                                        <span className="mobile-drawer-folder-icon">📁</span>
                                        <span className="text-truncate flex-grow-1">{folder.name}</span>
                                        <span className="badge rounded-pill bg-dark border text-muted px-2 py-1" style={{ fontSize: "0.7rem" }}>
                                            {folder.pdfCount || 0}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger p-1 mobile-drawer-folder-del"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteFolder(folder);
                                        }}
                                        title={`Delete ${folder.name}`}
                                        aria-label={`Delete ${folder.name}`}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}

                            {folders.length === 0 && (
                                <p className="text-muted small fst-italic px-2 py-1 mb-0" style={{ fontSize: "0.78rem" }}>
                                    No custom folders yet. Create one above to organize your PDFs!
                                </p>
                            )}
                        </div>
                    </div>

                    {/* View & Sort Preferences */}
                    <div className="mobile-drawer-section mb-3">
                        <div className="mobile-drawer-section-title">Display & Sort</div>
                        <div className="row g-2">
                            <div className="col-6">
                                <label className="form-label text-muted small mb-1" style={{ fontSize: "0.72rem" }}>View Mode</label>
                                <div className="btn-group w-100" role="group">
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${viewMode === "grid" ? "btn-primary" : "btn-outline-secondary"}`}
                                        onClick={() => onViewModeChange("grid")}
                                    >
                                        ▦ Grid
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${viewMode === "table" ? "btn-primary" : "btn-outline-secondary"}`}
                                        onClick={() => onViewModeChange("table")}
                                    >
                                        ☰ List
                                    </button>
                                </div>
                            </div>
                            <div className="col-6">
                                <label className="form-label text-muted small mb-1" style={{ fontSize: "0.72rem" }}>Sort by</label>
                                <select
                                    className="form-select form-select-sm"
                                    value={sortBy}
                                    onChange={(e) => onSortChange(e.target.value)}
                                >
                                    <option value="newest">Newest</option>
                                    <option value="oldest">Oldest</option>
                                    <option value="name_asc">Name A-Z</option>
                                    <option value="name_desc">Name Z-A</option>
                                    <option value="size_desc">Largest</option>
                                    <option value="size_asc">Smallest</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer / Logout */}
                <div className="mobile-drawer-footer">
                    <button
                        type="button"
                        className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
                        onClick={() => {
                            onClose();
                            onLogout();
                        }}
                    >
                        <span>🚪</span> Log Out
                    </button>
                </div>
            </aside>
        </div>
    );
}

export default MobileDrawer;
