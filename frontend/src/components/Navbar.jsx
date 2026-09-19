import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate("/login");
    }

    return (
        <nav className="navbar navbar-expand-lg bg-dark navbar-dark shadow-sm">
            <div className="container">
                <Link className="navbar-brand fw-bold d-flex align-items-center gap-2" to="/dashboard">
                    <span>📁</span> Private Drive
                </Link>

                <div className="d-flex align-items-center gap-2">
                    {user && (
                        <>
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
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
