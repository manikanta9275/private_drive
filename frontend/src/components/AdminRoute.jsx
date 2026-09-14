import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AdminRoute({ children }) {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user.role !== "admin") {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

export default AdminRoute;

