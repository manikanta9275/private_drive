import { useState, useEffect } from "react";
import api from "../services/api";

function AdminUsersModal({ isOpen, onClose }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newUserName, setNewUserName] = useState("");
    const [newAdminName, setNewAdminName] = useState("");
    const [creating, setCreating] = useState(false);
    const [creatingAdmin, setCreatingAdmin] = useState(false);
    const [error, setError] = useState("");

    // Notification for newly created user or regenerated PIN
    const [alertData, setAlertData] = useState(null); // { type: 'create'|'regenerate', name: '', pin: '' }
    const [copiedPin, setCopiedPin] = useState(null);

    // Deleting state
    const [deletingId, setDeletingId] = useState(null);
    const [deletingAdminId, setDeletingAdminId] = useState(null);
    const [regeneratingId, setRegeneratingId] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadUsers();
            setAlertData(null);
            setError("");
        }
    }, [isOpen]);

    async function loadUsers() {
        setLoading(true);
        try {
            const res = await api.get("/admin/users");
            // Filter out admin so only managed users appear or display all
            setUsers(res.data.users || []);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load users list.");
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateUser(e) {
        e.preventDefault();
        if (!newUserName.trim()) return;

        setCreating(true);
        setError("");
        setAlertData(null);

        try {
            const res = await api.post("/admin/users", { name: newUserName.trim() });
            const createdUser = res.data.user;

            setUsers((prev) => [createdUser, ...prev]);
            setAlertData({
                type: "create",
                name: createdUser.name,
                pin: createdUser.pin
            });
            setNewUserName("");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create user.");
        } finally {
            setCreating(false);
        }
    }

    async function handleRegeneratePin(user) {
        if (!window.confirm(`Are you sure you want to regenerate (change password) PIN for '${user.name}'? Their current PIN will no longer work.`)) {
            return;
        }

        setRegeneratingId(user.id);
        setError("");

        try {
            const res = await api.put(`/admin/users/${user.id}/regenerate-pin`);
            const newPin = res.data.newPin;

            // Update user in state
            setUsers((prev) =>
                prev.map((u) => (u.id === user.id ? { ...u, pin: newPin } : u))
            );

            setAlertData({
                type: "regenerate",
                name: user.name,
                pin: newPin
            });
        } catch (err) {
            alert(err.response?.data?.message || "Failed to regenerate PIN.");
        } finally {
            setRegeneratingId(null);
        }
    }

    async function handleCreateAdmin(event) {
        event.preventDefault();
        if (!newAdminName.trim()) return;

        setCreatingAdmin(true);
        setError("");
        setAlertData(null);

        try {
            const res = await api.post("/admin/administrators", {
                name: newAdminName.trim()
            });
            setAlertData({
                type: "admin-create",
                name: res.data.administrator.name,
                pin: res.data.administrator.pin
            });
            setNewAdminName("");
            await loadUsers();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create administrator.");
        } finally {
            setCreatingAdmin(false);
        }
    }

    async function handleDeleteUser(user) {
        if (!window.confirm(`Are you sure you want to delete user '${user.name}' and all their uploaded PDF files? This cannot be undone.`)) {
            return;
        }

        setDeletingId(user.id);
        setError("");

        try {
            await api.delete(`/admin/users/${user.id}`);
            setUsers((prev) => prev.filter((u) => u.id !== user.id));
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete user.");
        } finally {
            setDeletingId(null);
        }
    }

    async function handleDeleteAdministrator(administrator) {
        if (administrator.isBootstrap) return;
        if (!window.confirm(`Remove administrator '${administrator.name}'? Their administrator access will be permanently deleted.`)) return;

        setDeletingAdminId(administrator.id);
        setError("");
        try {
            await api.delete(`/admin/users/${administrator.id}`);
            setUsers((prev) => prev.filter((user) => user.id !== administrator.id));
        } catch (err) {
            setError(err.response?.data?.message || "Failed to remove administrator.");
        } finally {
            setDeletingAdminId(null);
        }
    }

    function copyToClipboard(pin) {
        navigator.clipboard.writeText(pin);
        setCopiedPin(pin);
        setTimeout(() => setCopiedPin(null), 2500);
    }

    if (!isOpen) return null;

    const administrators = users.filter((u) => u.role === "admin");
    const managedUsers = users.filter((u) => u.role !== "admin");

    return (
        <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.65)", zIndex: 1060 }}
        >
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content border-0 shadow-lg admin-modal-content">
                    {/* Header */}
                    <div className="modal-header admin-modal-header text-white border-bottom">
                        <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                            <span>◈</span> Access Management
                        </h5>
                        <button
                            type="button"
                            className="btn-close btn-close-white"
                            onClick={onClose}
                            aria-label="Close"
                        />
                    </div>

                    <div className="modal-body p-4">
                        {/* Error Alert */}
                        {error && (
                            <div className="alert alert-danger py-2 small" role="alert">
                                {error}
                            </div>
                        )}

                        {/* PIN Success Banner */}
                        {alertData && (
                            <div className="alert alert-success border border-success-subtle shadow-sm p-3 mb-4 rounded-3">
                                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                    <div>
                                        <h6 className="fw-bold mb-1 text-success">
                                            {alertData.type === "create" ? "🎉 User Created Successfully!" : alertData.type === "admin-create" ? "◈ Administrator Created Successfully!" : "🔄 PIN Regenerated (Password Changed)!"}
                                        </h6>
                                        <div className="small text-muted">
                                            Give this 4-digit PIN to <strong>{alertData.name}</strong> to log into their Drive:
                                        </div>
                                    </div>

                                    <div className="d-flex align-items-center gap-2">
                                        <span className="badge bg-dark fs-4 px-3 py-2 font-monospace tracking-wider text-warning">
                                            {alertData.pin}
                                        </span>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-success"
                                            onClick={() => copyToClipboard(alertData.pin)}
                                        >
                                            {copiedPin === alertData.pin ? "✓ Copied" : "📋 Copy PIN"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="admin-create-grid mb-4">
                        {/* Create User Form */}
                        <div className="admin-form-card">
                            <h6 className="fw-bold mb-2 text-dark">
                                ➕ Create New User
                            </h6>
                            <h6 className="mb-2">Auto-generates 4-digit PIN</h6>
                            <form onSubmit={handleCreateUser} className="row g-2">
                                <div className="col-12 col-md-8">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Enter user name (e.g. John Doe)"
                                        value={newUserName}
                                        onChange={(e) => setNewUserName(e.target.value)}
                                        disabled={creating}
                                        required
                                    />
                                </div>
                                <div className="col-12 col-md-4">
                                    <button
                                        type="submit"
                                        className="btn btn-primary w-100 fw-semibold"
                                        disabled={!newUserName.trim() || creating}
                                    >
                                        {creating ? "Generating..." : "Generate User & PIN"}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="admin-form-card admin-form-card-accent">
                            <h6 className="fw-bold mb-2">◈ Add Administrator</h6>
                            <p className="admin-form-help">Create a separate admin login with full console access.</p>
                            <form onSubmit={handleCreateAdmin} className="row g-2">
                                <div className="col-12">
                                    <input type="text" className="form-control" placeholder="Administrator name" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} disabled={creatingAdmin} required />
                                </div>
                                <div className="col-12">
                                    <button type="submit" className="btn btn-admin w-100 fw-semibold" disabled={!newAdminName.trim() || creatingAdmin}>
                                        {creatingAdmin ? "Creating access..." : "Create Administrator"}
                                    </button>
                                </div>
                            </form>
                        </div>
                        </div>

                        <section className="administrator-list-panel mb-4" aria-labelledby="administrator-list-title">
                            <div className="administrator-list-heading">
                                <div>
                                    <p className="administrator-list-kicker mb-1">PRIVILEGED ACCESS</p>
                                    <h6 id="administrator-list-title" className="mb-0 fw-bold">Administrators ({administrators.length})</h6>
                                </div>
                                <span className="administrator-list-mark">◈</span>
                            </div>
                            {administrators.length === 0 ? (
                                <p className="administrator-list-empty mb-0">No administrator accounts found.</p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table administrator-table align-middle mb-0">
                                        <thead>
                                            <tr>
                                                <th>Administrator</th>
                                                <th>PIN / Password</th>
                                                <th className="text-end">Access</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {administrators.map((administrator) => (
                                                <tr key={administrator.id}>
                                                    <td>
                                                        <strong>{administrator.name}</strong>
                                                        <small>{administrator.email || "No email added"}</small>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <span className="administrator-pin">{administrator.pin}</span>
                                                            <button type="button" className="administrator-copy" title="Copy administrator PIN" onClick={() => copyToClipboard(administrator.pin)}>
                                                                {copiedPin === administrator.pin ? "✓" : "📋"}
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="text-end">
                                                        <div className="administrator-actions">
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm administrator-reset"
                                                                onClick={() => handleRegeneratePin(administrator)}
                                                                disabled={regeneratingId === administrator.id || administrator.isBootstrap || deletingAdminId === administrator.id}
                                                                title={administrator.isBootstrap ? "Bootstrap PIN is controlled by the server configuration" : "Reset administrator PIN"}
                                                            >
                                                                {regeneratingId === administrator.id ? "Resetting..." : administrator.isBootstrap ? "Server PIN" : "Reset PIN"}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm administrator-delete"
                                                                onClick={() => handleDeleteAdministrator(administrator)}
                                                                disabled={administrator.isBootstrap || deletingAdminId === administrator.id || regeneratingId === administrator.id}
                                                                title={administrator.isBootstrap ? "Bootstrap administrator cannot be deleted" : "Remove administrator"}
                                                            >
                                                                {deletingAdminId === administrator.id ? "Removing..." : "Remove"}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        {/* Users Table */}
                        <h6 className="fw-bold mb-3 text-dark d-flex justify-content-between align-items-center">
                            <span>All Registered Users ({managedUsers.length})</span>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={loadUsers}
                                disabled={loading}
                            >
                                🔄 Refresh
                            </button>
                        </h6>

                        {loading ? (
                            <div className="text-center py-4">
                                <div className="spinner-border spinner-border-sm text-primary" role="status" />
                                <span className="ms-2 text-muted small">Loading users...</span>
                            </div>
                        ) : managedUsers.length === 0 ? (
                            <div className="alert alert-light border text-center text-muted py-4">
                                No users created yet. Use the form above to create your first user.
                            </div>
                        ) : (
                            <div className="table-responsive border rounded bg-white">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light small">
                                        <tr>
                                            <th>User Name</th>
                                            <th>4-Digit PIN</th>
                                            <th>Files Stored</th>
                                            <th className="text-end">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {managedUsers.map((u) => (
                                            <tr key={u.id}>
                                                <td className="fw-medium text-dark">
                                                    👤 {u.name}
                                                    <div className="small text-muted">
                                                        Created: {new Date(u.createdAt).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="d-flex align-items-center gap-1">
                                                        <span className="badge bg-secondary font-monospace fs-6 px-2 py-1">
                                                            {u.pin}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm text-muted p-0 px-1"
                                                            title="Copy PIN"
                                                            onClick={() => copyToClipboard(u.pin)}
                                                        >
                                                            {copiedPin === u.pin ? "✓" : "📋"}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="small text-muted">
                                                    {u.pdfCount} {u.pdfCount === 1 ? "file" : "files"}
                                                </td>
                                                <td className="text-end">
                                                    <div className="btn-group btn-group-sm">
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-warning"
                                                            title="Regenerate 4-digit PIN (change password)"
                                                            onClick={() => handleRegeneratePin(u)}
                                                            disabled={regeneratingId === u.id}
                                                        >
                                                            {regeneratingId === u.id ? "..." : "🔄 Reset PIN"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-danger"
                                                            title="Delete User and all files"
                                                            onClick={() => handleDeleteUser(u)}
                                                            disabled={deletingId === u.id}
                                                        >
                                                            {deletingId === u.id ? "..." : "🗑️ Delete"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer admin-modal-footer border-top">
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

export default AdminUsersModal;
