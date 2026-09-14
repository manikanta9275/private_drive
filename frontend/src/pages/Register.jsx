import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function Register() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Redirect to dashboard if user is already logged in
    useEffect(() => {
        if (user) {
            navigate("/dashboard", { replace: true });
        }
    }, [user, navigate]);

    function handleChange(event) {
        setForm({
            ...form,
            [event.target.name]: event.target.value
        });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setMessage("");
        setError("");

        const cleanName = form.name.trim();
        const cleanEmail = form.email.trim();

        if (!cleanName || !cleanEmail || !form.password || !form.confirmPassword) {
            setError("All fields are required.");
            return;
        }

        if (form.password.length < 6) {
            setError("Password must contain at least 6 characters.");
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const response = await api.post("/auth/register", {
                name: cleanName,
                email: cleanEmail,
                password: form.password,
                confirmPassword: form.confirmPassword
            });

            setMessage(response.data.message || "Registration successful! Redirecting to login...");

            setTimeout(() => {
                navigate("/login");
            }, 1200);

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Registration failed. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="container">
            <div className="row justify-content-center mt-5">
                <div className="col-md-5 col-lg-4">
                    <div className="card shadow-sm border-0">
                        <div className="card-body p-4">
                            <h2 className="text-center mb-1 fw-bold">
                                Create Account
                            </h2>

                            <p className="text-center text-muted mb-4">
                                Join Private PDF Drive
                            </p>

                            {message && (
                                <div className="alert alert-success py-2" role="alert">
                                    {message}
                                </div>
                            )}

                            {error && (
                                <div className="alert alert-danger py-2" role="alert">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label className="form-label" htmlFor="register-name">
                                        Full Name
                                    </label>
                                    <input
                                        id="register-name"
                                        type="text"
                                        name="name"
                                        className="form-control"
                                        value={form.name}
                                        onChange={handleChange}
                                        autoComplete="name"
                                        required
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label" htmlFor="register-email">
                                        Email Address
                                    </label>
                                    <input
                                        id="register-email"
                                        type="email"
                                        name="email"
                                        className="form-control"
                                        value={form.email}
                                        onChange={handleChange}
                                        autoComplete="email"
                                        required
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label" htmlFor="register-password">
                                        Password
                                    </label>
                                    <input
                                        id="register-password"
                                        type="password"
                                        name="password"
                                        className="form-control"
                                        value={form.password}
                                        onChange={handleChange}
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label" htmlFor="register-confirmPassword">
                                        Confirm Password
                                    </label>
                                    <input
                                        id="register-confirmPassword"
                                        type="password"
                                        name="confirmPassword"
                                        className="form-control"
                                        value={form.confirmPassword}
                                        onChange={handleChange}
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary w-100 mt-2"
                                    disabled={loading}
                                >
                                    {loading ? "Creating account..." : "Create Account"}
                                </button>
                            </form>

                            <div className="text-center mt-4">
                                <span className="text-muted">Already have an account?</span>{" "}
                                <Link to="/login" className="text-decoration-none fw-semibold">
                                    Log In
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;
