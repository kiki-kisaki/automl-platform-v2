import { createContext, useContext, useState, useEffect } from "react";
import { getMe } from "../api/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (token) {
            getMe()
                .then((res) => setUser(res.data.data))
                .catch(() => localStorage.clear())
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const loginUser = (userData, token) => {
        localStorage.setItem("access_token", token);
        setUser(userData);
    };

    const logoutUser = () => {
        localStorage.clear();
        setUser(null);
    };

    const isAuthenticated = () => !!localStorage.getItem("access_token");

    return (
        <AuthContext.Provider value={{ user, loading, loginUser, logoutUser, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);