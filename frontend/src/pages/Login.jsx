import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function Login() {
    const navigate = useNavigate();
    const { user, login } = useAuth();

    const [pin, setPin] = useState("");
    const [showPin, setShowPin] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Redirect to dashboard if user is already logged in
    useEffect(() => {
        if (user) {
            navigate("/dashboard", { replace: true });
        }
    }, [user, navigate]);

    async function submitPin(cleanPin) {
        if (!cleanPin || cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
            setError("Please enter a valid 4-digit PIN.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await api.post("/auth/pin-login", { pin: cleanPin });
            login(response.data);
            navigate("/dashboard", { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || "Invalid 4-digit PIN. Access denied.");
            setPin("");
        } finally {
            setLoading(false);
        }
    }

    function handlePinSubmit(e) {
        if (e) e.preventDefault();
        submitPin(pin.trim());
    }

    function handlePinInput(e) {
        const val = e.target.value.replace(/\D/g, "").slice(0, 4);
        setPin(val);
        setError("");

        // Auto-submit when all 4 digits are entered
        if (val.length === 4) {
            submitPin(val);
        }
    }

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center px-3">
            <div className="card shadow border-0" style={{ maxWidth: "420px", width: "100%", borderRadius: "16px" }}>
                <div className="card-body p-4 p-sm-5 text-center">
                    {/* Icon */}
                    <div
                        className="bg-primary bg-opacity-10 text-primary mx-auto rounded-circle d-flex align-items-center justify-content-center mb-3"
                        style={{ width: "70px", height: "70px" }}
                    >
                        <span className="fs-1">🔒</span>
                    </div>

                    <h3 className="fw-bold text-light mb-1">
                        Private PDF Drive
                    </h3>
                    <p className="text-muted small mb-4">
                        Enter your assigned 4-digit PIN to access your secure drive
                    </p>

                    {error && (
                        <div className="alert alert-danger py-2 small mb-4" role="alert">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handlePinSubmit}>
                        {/* PIN Input with show/hide toggle */}
                        <div className="mb-3 position-relative">
                            <input
                                type={showPin ? "text" : "password"}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength="4"
                                className="form-control form-control-lg text-center fw-bold fs-3 tracking-widest border-2"
                                placeholder="••••"
                                value={pin}
                                onChange={handlePinInput}
                                autoFocus
                                autoComplete="off"
                                style={{
                                    letterSpacing: "14px",
                                    height: "65px",
                                    borderRadius: "12px",
                                    paddingRight: "50px"
                                }}
                            />
                            <button
                                type="button"
                                className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted text-decoration-none pe-3"
                                onClick={() => setShowPin(!showPin)}
                                tabIndex="-1"
                                title={showPin ? "Hide PIN" : "Show PIN"}
                                style={{ zIndex: 5 }}
                            >
                                {showPin ? "👁️" : "🔒"}
                            </button>
                        </div>
                        <div className="form-text mt-0 mb-4 text-muted small">
                            Auto-unlocks when 4 digits are entered
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-100 fw-semibold shadow-sm"
                            disabled={pin.length !== 4 || loading}
                            style={{ borderRadius: "12px", height: "52px" }}
                        >
                            {loading ? (
                                <span className="d-flex align-items-center justify-content-center gap-2">
                                    <span className="spinner-border spinner-border-sm" role="status" />
                                    Verifying PIN...
                                </span>
                            ) : (
                                "Unlock Drive"
                            )}
                        </button>
                    </form>

                    

                    <div className="mt-4 pt-3 border-top text-muted small">
                        🛡️ Protected by Private PDF Drive Security
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;
