import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import PdfViewerModal from "../components/PdfViewerModal";
import api from "../services/api";

function AdminDashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalPdfs: 0,
        totalStorageBytes: 0,
        totalLogs: 0
    });

    const [activeTab, setActiveTab] = useState("logs"); // 'logs' | 'users' | 'files'
    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [allPdfs, setAllPdfs] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [logActionFilter, setLogActionFilter] = useState("ALL");

    // Modal state
    const [previewPdf, setPreviewPdf] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [downloadingId, setDownloadingId] = useState(null);

    useEffect(() => {
        loadAdminData();
    }, []);

    async function handleAdminDownload(pdf) {
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
            console.error("Admin download failed:", err);
            alert(err.response?.data?.message || "Failed to download PDF.");
        } finally {
            setDownloadingId(null);
        }
    }


    async function loadAdminData() {
        setLoading(true);
        setError("");
        try {
            const [statsRes, logsRes, usersRes, pdfsRes] = await Promise.all([
                api.get("/admin/stats"),
                api.get("/admin/logs"),
                api.get("/admin/users"),
                api.get("/admin/all-pdfs")
            ]);

            setStats(statsRes.data);
            setLogs(logsRes.data.logs || []);
            setUsers(usersRes.data.users || []);
            setAllPdfs(pdfsRes.data.pdfs || []);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load admin management data.");
        } finally {
            setLoading(false);
        }
    }

    async function handleAdminDeleteFile() {
        if (!deleteTarget) return;

        setDeleting(true);
        try {
            await api.delete(`/admin/pdfs/${deleteTarget._id}`);
            setAllPdfs((prev) => prev.filter((p) => p._id !== deleteTarget._id));
            setDeleteTarget(null);
            // Refresh stats & logs
            loadAdminData();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete file as admin.");
        } finally {
            setDeleting(false);
        }
    }

    function formatBytes(bytes) {
        if (!bytes) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    function getActionBadgeClass(action) {
        switch (action) {
            case "USER_REGISTER":
                return "bg-success-subtle text-success border-success-subtle";
            case "USER_LOGIN":
                return "bg-info-subtle text-info border-info-subtle";
            case "PDF_UPLOAD":
                return "bg-primary-subtle text-primary border-primary-subtle";
            case "PDF_VIEW":
                return "bg-secondary-subtle text-secondary border-secondary-subtle";
            case "PDF_DELETE":
                return "bg-warning-subtle text-warning border-warning-subtle";
            case "ADMIN_DELETE_PDF":
                return "bg-danger-subtle text-danger border-danger-subtle";
            default:
                return "bg-light text-dark border";
        }
    }

    const filteredLogs = logs.filter((log) => {
        if (logActionFilter === "ALL") return true;
        return log.action === logActionFilter;
    });

    return (
        <div className="admin-dashboard-shell min-vh-100 d-flex flex-column">
            <Navbar />

            <main className="container py-4 flex-grow-1">
                {/* Header */}
                <div className="admin-dashboard-header d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                    <div>
                        <h2 className="fw-bold mb-1">
                            🛡️ Admin Control Panel
                        </h2>
                        <p className="text-muted mb-0">
                            Monitor system activity logs, inspect registered accounts, and manage global storage.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                        onClick={loadAdminData}
                        disabled={loading}
                    >
                        🔄 Refresh Data
                    </button>
                </div>

                {error && (
                    <div className="alert alert-danger py-2 mb-4" role="alert">
                        {error}
                    </div>
                )}

                {/* Metrics Cards */}
                <div className="row g-3 mb-4">
                    <div className="col-12 col-sm-6 col-lg-3">
                        <div className="card shadow-sm border-0 border-start border-primary border-4 h-100">
                            <div className="card-body">
                                <div className="text-muted small text-uppercase fw-semibold mb-1">
                                    Total Users
                                </div>
                                <h3 className="fw-bold mb-0 text-dark">
                                    {stats.totalUsers}
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-sm-6 col-lg-3">
                        <div className="card shadow-sm border-0 border-start border-success border-4 h-100">
                            <div className="card-body">
                                <div className="text-muted small text-uppercase fw-semibold mb-1">
                                    Uploaded PDFs
                                </div>
                                <h3 className="fw-bold mb-0 text-dark">
                                    {stats.totalPdfs}
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-sm-6 col-lg-3">
                        <div className="card shadow-sm border-0 border-start border-info border-4 h-100">
                            <div className="card-body">
                                <div className="text-muted small text-uppercase fw-semibold mb-1">
                                    Storage Used
                                </div>
                                <h3 className="fw-bold mb-0 text-dark">
                                    {formatBytes(stats.totalStorageBytes)}
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-sm-6 col-lg-3">
                        <div className="card shadow-sm border-0 border-start border-warning border-4 h-100">
                            <div className="card-body">
                                <div className="text-muted small text-uppercase fw-semibold mb-1">
                                    Activity Logs
                                </div>
                                <h3 className="fw-bold mb-0 text-dark">
                                    {stats.totalLogs}
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <ul className="nav nav-tabs mb-3">
                    <li className="nav-item">
                        <button
                            type="button"
                            className={`nav-link fw-semibold ${activeTab === "logs" ? "active text-primary" : "text-secondary"}`}
                            onClick={() => setActiveTab("logs")}
                        >
                            📋 Activity Audit Logs ({logs.length})
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            type="button"
                            className={`nav-link fw-semibold ${activeTab === "users" ? "active text-primary" : "text-secondary"}`}
                            onClick={() => setActiveTab("users")}
                        >
                            👥 User Accounts ({users.length})
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            type="button"
                            className={`nav-link fw-semibold ${activeTab === "files" ? "active text-primary" : "text-secondary"}`}
                            onClick={() => setActiveTab("files")}
                        >
                            📁 System PDF Files ({allPdfs.length})
                        </button>
                    </li>
                </ul>

                {/* Tab 1: Activity Tracker */}
                {activeTab === "logs" && (
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-white py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                            <h6 className="mb-0 fw-bold">
                                Private Audit Trail (Logs Database)
                            </h6>

                            <div className="d-flex align-items-center gap-2">
                                <span className="small text-muted">Filter:</span>
                                <select
                                    className="form-select form-select-sm"
                                    value={logActionFilter}
                                    onChange={(e) => setLogActionFilter(e.target.value)}
                                    style={{ width: "180px" }}
                                >
                                    <option value="ALL">All Actions</option>
                                    <option value="USER_REGISTER">Registration</option>
                                    <option value="USER_LOGIN">Logins</option>
                                    <option value="PDF_UPLOAD">Uploads</option>
                                    <option value="PDF_VIEW">Views</option>
                                    <option value="PDF_DELETE">Deletions</option>
                                    <option value="ADMIN_DELETE_PDF">Admin Deletions</option>
                                </select>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light small">
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Action</th>
                                        <th>User</th>
                                        <th>Details / Metadata</th>
                                        <th>IP Address</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center text-muted py-4">
                                                No activity logs found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLogs.map((log) => (
                                            <tr key={log._id}>
                                                <td className="small text-muted" style={{ whiteSpace: "nowrap" }}>
                                                    {new Date(log.createdAt).toLocaleString(undefined, {
                                                        dateStyle: "short",
                                                        timeStyle: "medium"
                                                    })}
                                                </td>
                                                <td>
                                                    <span className={`badge border ${getActionBadgeClass(log.action)}`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="fw-medium text-dark small">{log.userName}</div>
                                                    <div className="text-muted small">{log.userEmail}</div>
                                                </td>
                                                <td className="small text-muted">
                                                    {log.details?.fileName && (
                                                        <span className="fw-semibold text-dark me-2">
                                                            📄 {log.details.fileName}
                                                        </span>
                                                    )}
                                                    {log.details?.fileSize && (
                                                        <span>({formatBytes(log.details.fileSize)})</span>
                                                    )}
                                                    {log.details?.role && (
                                                        <span>Role: {log.details.role}</span>
                                                    )}
                                                </td>
                                                <td className="small text-muted font-monospace">
                                                    {log.ipAddress}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tab 2: User Accounts */}
                {activeTab === "users" && (
                    <div className="card shadow-sm border-0">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0 admin-users-table">
                                <thead className="table-light small">
                                    <tr>
                                        <th>User</th>
                                        <th>Role</th>
                                        <th>Registered Date</th>
                                        <th>Files Stored</th>
                                        <th>Storage Used</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u._id}>
                                            <td>
                                                <div className="fw-semibold text-dark">{u.name}</div>
                                                <small className="text-muted">{u.email}</small>
                                            </td>
                                            <td>
                                                <span className={`badge ${u.role === "admin" ? "bg-danger" : "bg-secondary"} text-uppercase`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="small text-muted">
                                                {new Date(u.createdAt).toLocaleDateString(undefined, {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric"
                                                })}
                                            </td>
                                            <td>
                                                <span className="badge bg-light text-dark border">
                                                    {u.pdfCount} {u.pdfCount === 1 ? "PDF" : "PDFs"}
                                                </span>
                                            </td>
                                            <td className="small fw-medium text-muted">
                                                {formatBytes(u.totalSize)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tab 3: System PDF Files */}
                {activeTab === "files" && (
                    <div className="card shadow-sm border-0">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0 admin-files-table">
                                <thead className="table-light small">
                                    <tr>
                                        <th>File Name</th>
                                        <th>Owner</th>
                                        <th>Size</th>
                                        <th>Uploaded Date</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allPdfs.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center text-muted py-4">
                                                No PDF documents stored in the system yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        allPdfs.map((pdf) => (
                                            <tr key={pdf._id}>
                                                <td>
                                                    <div
                                                        className="d-flex align-items-center cursor-pointer"
                                                        onClick={() => setPreviewPdf(pdf)}
                                                        style={{ cursor: "pointer" }}
                                                    >
                                                        <span className="fs-5 me-2 text-danger">📑</span>
                                                        <span className="fw-medium admin-file-name" title={pdf.fileName}>
                                                            {pdf.fileName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="small fw-semibold">{pdf.userId?.name || "Unknown"}</div>
                                                    <small className="text-muted">{pdf.userId?.email || "N/A"}</small>
                                                </td>
                                                <td className="small text-muted">
                                                    {formatBytes(pdf.fileSize)}
                                                </td>
                                                <td className="small text-muted">
                                                    {new Date(pdf.createdAt).toLocaleDateString()}
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
                                                            onClick={() => handleAdminDownload(pdf)}
                                                            disabled={downloadingId === pdf._id}
                                                            title="Download PDF"
                                                        >
                                                            {downloadingId === pdf._id ? "⏳" : "⬇️"}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-danger"
                                                            onClick={() => setDeleteTarget(pdf)}
                                                            title="Admin Force Delete"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Preview Modal */}
            <PdfViewerModal
                pdf={previewPdf}
                onClose={() => setPreviewPdf(null)}
            />

            {/* Admin Delete Confirmation Modal */}
            {deleteTarget && (
                <div
                    className="modal show d-block"
                    tabIndex="-1"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1070 }}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-danger text-white">
                                <h5 className="modal-title fw-bold">
                                    🛡️ Admin Action: Delete File
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => setDeleteTarget(null)}
                                    disabled={deleting}
                                />
                            </div>
                            <div className="modal-body">
                                <p className="mb-2">
                                    As an administrator, you are about to permanently delete:
                                </p>
                                <div className="p-2 bg-light border rounded mb-2">
                                    <strong>{deleteTarget.fileName}</strong>
                                    <div className="small text-muted">Owner: {deleteTarget.userId?.email || "Unknown"}</div>
                                </div>
                                <small className="text-danger fw-semibold">
                                    This will delete the file from Cloudinary and the MongoDB database. This action will be recorded in the audit trail.
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
                                    onClick={handleAdminDeleteFile}
                                    disabled={deleting}
                                >
                                    {deleting ? "Deleting..." : "Confirm Admin Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;

