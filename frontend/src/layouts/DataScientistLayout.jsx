import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function Layout() {
    return (
        <div style={{ display: "flex" }}>
            <Sidebar />
            <main style={{
                marginLeft: "220px", flex: 1, minHeight: "100vh",
                padding: "32px 36px", background: "var(--bg-base)",
            }}>
                <Outlet />
            </main>
        </div>
    );
}