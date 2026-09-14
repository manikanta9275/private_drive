import { useState } from "react";
import api from "../services/api";

function CreateFolderModal({ isOpen, onClose, onCreated }) {
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    async function handleSubmit(event) {
        event.preventDefault();
        const cleanName = name.trim();
        if (!cleanName) {
            setError("Enter a folder name.");
            return;
        }

        setSaving(true);
        setError("");
        try {
            const response = await api.post("/folders", { name: cleanName });
            onCreated(response.data.folder);
            setName("");
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create folder.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header">
                        <h5 className="modal-title fw-bold">📁 Create folder</h5>
                        <button type="button" className="btn-close" onClick={onClose} disabled={saving} aria-label="Close" />
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            {error && <div className="alert alert-danger py-2 small">{error}</div>}
                            <label htmlFor="folder-name" className="form-label">Folder name</label>
                            <input id="folder-name" className="form-control" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoFocus placeholder="e.g. College Documents" disabled={saving} />
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Creating..." : "Create folder"}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default CreateFolderModal;
