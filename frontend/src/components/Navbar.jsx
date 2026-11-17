import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar({ onToggleMobileMenu, onQuickUpload }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate("/login");
    }

    const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : "U";

    return (
        <nav className="navbar navbar-expand-lg bg-dark navbar-dark shadow-sm">
            <div className="container">
                {/* Left side: Mobile Menu Button + Brand */}
                <div className="d-flex align-items-center gap-2">
                    {onToggleMobileMenu && (
                        <button
                            type="button"
                            className="mobile-menu-btn d-md-none"
                            onClick={onToggleMobileMenu}
                            aria-label="Open navigation menu"
                            title="Menu & Operations"
                        >
                            <span className="mobile-menu-icon">☰</span>
                        </button>
                    )}

                    <Link className="navbar-brand fw-bold d-flex align-items-center gap-2 mb-0" to="/dashboard">
                        <span>📁</span> Private Drive
                    </Link>
                </div>

                {/* Right side: Desktop user info + Mobile quick buttons */}
                <div className="d-flex align-items-center gap-2">
                    {user && (
                        <>
                            {/* Mobile quick action buttons */}
                            {onQuickUpload && (
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm d-md-none d-flex align-items-center gap-1 px-2 py-1 shadow-sm"
                                    onClick={onQuickUpload}
                                    title="Upload PDF"
                                    style={{ fontSize: "0.8rem", borderRadius: "8px" }}
                                >
                                    <span>➕</span>
                                    <span>Upload</span>
                                </button>
                            )}

                            {onToggleMobileMenu && (
                                <button
                                    type="button"
                                    className="mobile-avatar-btn d-md-none"
                                    onClick={onToggleMobileMenu}
                                    title="User Menu"
                                    aria-label="User Menu"
                                >
                                    {userInitial}
                                </button>
                            )}

                            {/* Desktop only user badges and log out */}
                            <div className="d-none d-md-flex align-items-center gap-2">
                                <span className="text-light me-1 small">
                                    👤 {user.name}
                                </span>

                                {user.role === "admin" && (
                                    <span className="badge bg-danger text-uppercase px-2 py-1 me-2" style={{ fontSize: "10px" }}>
                                        Administrator
                                    </span>
                                )}

                                <button
                                    className="btn btn-outline-danger btn-sm px-3"
                                    onClick={handleLogout}
                                    type="button"
                                >
                                    Log Out
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
