import {
    createContext,
    useContext,
    useState
} from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {

    const [user, setUser] = useState(() => {
        try {
            const savedUser = localStorage.getItem("user");
            const token = localStorage.getItem("token");

            if (savedUser && token) {
                return JSON.parse(savedUser);
            }
        } catch (error) {
            console.error("Failed to parse stored user from localStorage:", error);
            localStorage.removeItem("user");
            localStorage.removeItem("token");
        }

        return null;
    });

    function login(data) {
        if (!data || !data.token || !data.user) {
            console.error("Invalid login data provided to AuthContext:", data);
            return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        setUser(data.user);
    }

    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setUser(null);
    }

    const value = {
        user,
        isAuthenticated: Boolean(user),
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
}
