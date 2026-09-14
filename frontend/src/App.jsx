import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";

function RootRedirect() {
    const { user } = useAuth();
    return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<RootRedirect />} />

                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Navigate to="/login" replace />} />

                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* Fallback for unknown routes */}
                    <Route path="*" element={<RootRedirect />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;