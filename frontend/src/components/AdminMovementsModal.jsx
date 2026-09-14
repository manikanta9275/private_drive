import { useState, useEffect } from "react";
import api from "../services/api";

function AdminMovementsModal({ isOpen, onClose }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterAction, setFilterAction] = useState("ALL");
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen) {
            loadLogs();
        }
    }, [isOpen]);

    async function loadLogs() {
        setLoading(true);
        setError("");
        try {
            const res = await api.get("/admin/logs?limit=150");
            setLogs(res.data.logs || []);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load activity logs.");
        } finally {
            setLoading(false);
        }
    }

    function getActionBadge(action) {
        switch (action) {
            case "USER_LOGIN":
                return <span className="badge bg-success-subtle text-success border border-success-subtle">🔑 Login</span>;
            case "PDF_UPLOAD":
                return <span className="badge bg-primary-subtle text-primary border border-primary-subtle">⬆️ Upload</span>;
            case "PDF_VIEW":
                return <span className="badge bg-info-subtle text-info border border-info-subtle">👁️ Preview</span>;
            case "PDF_DOWNLOAD":
                return <span className="badge bg-cyan-subtle text-dark border">⬇️ Download</span>;
            case "PDF_RENAME":
                return <span className="badge bg-dark-subtle text-dark border">✎ Rename</span>;
            case "PDF_DELETE":
            case "ADMIN_DELETE_PDF":
                return <span className="badge bg-danger-subtle text-danger border border-danger-subtle">🗑️ Delete File</span>;
            case "ADMIN_CREATE_USER":
                return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">➕ Create User</span>;
            case "ADMIN_CREATE_ADMIN":
                return <span className="badge admin-audit-badge">◈ Create Administrator</span>;
            case "ADMIN_REGENERATE_PIN":
                return <span className="badge bg-secondary-subtle text-secondary border">🔄 Reset PIN</span>;
            case "ADMIN_REGENERATE_ADMIN_PIN":
                return <span className="badge admin-audit-badge">◈ Reset Admin PIN</span>;
            case "ADMIN_DELETE_USER":
                return <span className="badge bg-danger text-white">🚫 Delete User</span>;
            default:
                return <span className="badge bg-light text-dark border">{action}</span>;
        }
    }

    function formatBytes(bytes) {
        if (!bytes) return "";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    if (!isOpen) return null;

    const filteredLogs = logs.filter((log) => {
        if (filterAction === "ALL") return true;
        return log.action === filterAction;
    });

    return (
        <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.65)", zIndex: 1060 }}
        >
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content border-0 shadow-lg">
                    {/* Header */}
                    <div className="modal-header bg-dark text-white border-bottom">
                        <div className="d-flex align-items-center gap-2">
                            <span className="fs-5">📋</span>
                            <div>
                                <h5 className="modal-title fw-bold mb-0">
                                    All User Movements (Audit Logs)
                                </h5>
                                <small className="text-light-50">
                                    Live activity tracking of user logins, file operations, and administrative actions
                                </small>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="btn-close btn-close-white"
                            onClick={onClose}
                            aria-label="Close"
                        />
                    </div>

                    <div className="modal-body p-4">
                        {/* Filter Bar */}
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 p-2 bg-light rounded border">
                            <div className="d-flex align-items-center gap-2">
                                <span className="small fw-semibold text-muted">Filter Movements:</span>
                                <select
                                    className="form-select form-select-sm"
                                    value={filterAction}
                                    onChange={(e) => setFilterAction(e.target.value)}
                                    style={{ width: "200px" }}
                                >
                                    <option value="ALL">All Movements ({logs.length})</option>
                                    <option value="USER_LOGIN">Logins</option>
                                    <option value="PDF_UPLOAD">Uploads</option>
                                    <option value="PDF_VIEW">Previews / Views</option>
                                    <option value="PDF_RENAME">Renames</option>
                                    <option value="PDF_DELETE">File Deletions</option>
                                    <option value="ADMIN_CREATE_USER">User Creations</option>
                                    <option value="ADMIN_CREATE_ADMIN">Administrator Creations</option>
                                    <option value="ADMIN_REGENERATE_PIN">PIN Resets</option>
                                    <option value="ADMIN_REGENERATE_ADMIN_PIN">Administrator PIN Resets</option>
                                    <option value="ADMIN_DELETE_USER">User Deletions</option>
                                </select>
                            </div>

                            <button
                                type="button"
                                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                                onClick={loadLogs}
                                disabled={loading}
                            >
                                🔄 Refresh Movements
                            </button>
                        </div>

                        {error && (
                            <div className="alert alert-danger py-2 small" role="alert">
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status" />
                                <p className="text-muted mt-2 small">Loading audit movements...</p>
                            </div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="alert alert-light border text-center text-muted py-4">
                                No user movements found matching your filter.
                            </div>
                        ) : (
                            <div className="table-responsive border rounded bg-white">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light small">
                                        <tr>
                                            <th>Timestamp</th>
                                            <th>User Name</th>
                                            <th>Movement</th>
                                            <th>Details / Target</th>
                                            <th>IP Address</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLogs.map((log) => (
                                            <tr key={log._id}>
                                                <td className="small text-muted" style={{ whiteSpace: "nowrap" }}>
                                                    {new Date(log.createdAt).toLocaleString(undefined, {
                                                        dateStyle: "short",
                                                        timeStyle: "medium"
                                                    })}
                                                </td>
                                                <td>
                                                    <span className="fw-semibold text-dark small">
                                                        👤 {log.userName}
                                                    </span>
                                                </td>
                                                <td>
                                                    {getActionBadge(log.action)}
                                                </td>
                                                <td className="small text-muted">
                                                    {log.details?.fileName && (
                                                        <span className="text-dark fw-medium me-2">
                                                            📄 {log.details.fileName}
                                                        </span>
                                                    )}
                                                    {log.details?.previousFileName && (
                                                        <span>Previously: <strong>{log.details.previousFileName}</strong></span>
                                                    )}
                                                    {log.details?.createdAdminName && (
                                                        <span>Administrator: <strong>{log.details.createdAdminName}</strong></span>
                                                    )}
                                                    {log.details?.fileSize && (
                                                        <span className="badge bg-light text-secondary border">
                                                            {formatBytes(log.details.fileSize)}
                                                        </span>
                                                    )}
                                                    {log.details?.createdUserName && (
                                                        <span>New user: <strong>{log.details.createdUserName}</strong></span>
                                                    )}
                                                    {log.details?.targetUserName && (
                                                        <span>Target: <strong>{log.details.targetUserName}</strong></span>
                                                    )}
                                                    {log.details?.deletedUserName && (
                                                        <span>Deleted: <strong>{log.details.deletedUserName}</strong></span>
                                                    )}
                                                </td>
                                                <td className="small font-monospace text-muted">
                                                    {log.ipAddress}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer bg-light border-top">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminMovementsModal;
