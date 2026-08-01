import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import LoginPage from "./pages/LoginPage";

// Admin
import AdminLayout from "./layouts/AdminLayout";
import AdminPage from "./pages/admin/AdminPage";

// Data Engineer
import DataEngineerLayout from "./layouts/DataEngineerLayout";
import UploadPage from "./pages/data_engineer/UploadPage";

// Data Scientist
import DataScientistLayout from "./layouts/DataScientistLayout";
import DatasetListPage from "./pages/data_scientist/DatasetListPage";
import PreprocessPage from "./pages/data_scientist/PreprocessPage";

// ML Engineer
import MLEngineerLayout from "./layouts/MLEngineerLayout";
import ExperimentsPage from "./pages/ml_engineer/ExperimentsPage";
import TrainingPage from "./pages/ml_engineer/TrainingPage";

// Viewer
import ViewerLayout from "./layouts/ViewerLayout";
import ResultsPage from "./pages/viewer/ResultsPage";

const ROLE_HOME = {
  admin: "/admin",
  data_engineer: "/engineer/upload",
  data_scientist: "/scientist/datasets",
  ml_engineer: "/ml/experiments",
  viewer: "/viewer/results",
};

function PrivateRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return null;
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={ROLE_HOME[user?.role] || "/login"} replace />;
  }
  return children;
}

function RootRedirect() {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return null;
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user?.role] || "/login"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Admin */}
        <Route path="/admin" element={
          <PrivateRoute allowedRoles={["admin"]}>
            <AdminLayout />
          </PrivateRoute>
        }>
          <Route index element={<AdminPage />} />
        </Route>

        {/* Data Engineer */}
        <Route path="/engineer" element={
          <PrivateRoute allowedRoles={["data_engineer"]}>
            <DataEngineerLayout />
          </PrivateRoute>
        }>
          <Route path="upload" element={<UploadPage />} />
        </Route>

        {/* Data Scientist */}
        <Route path="/scientist" element={
          <PrivateRoute allowedRoles={["data_scientist"]}>
            <DataScientistLayout />
          </PrivateRoute>
        }>
          <Route path="datasets" element={<DatasetListPage />} />
          <Route path="preprocess/:datasetId" element={<PreprocessPage />} />
        </Route>

        {/* ML Engineer */}
        <Route path="/ml" element={
          <PrivateRoute allowedRoles={["ml_engineer"]}>
            <MLEngineerLayout />
          </PrivateRoute>
        }>
          <Route path="experiments" element={<ExperimentsPage />} />
          <Route path="training/new" element={<TrainingPage />} />
        </Route>

        {/* Viewer */}
        <Route path="/viewer" element={
          <PrivateRoute allowedRoles={["viewer"]}>
            <ViewerLayout />
          </PrivateRoute>
        }>
          <Route path="results" element={<ResultsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}