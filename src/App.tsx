import { HashRouter, Routes, Route } from 'react-router-dom';
import { GovProvider } from './context/GovContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import Home from './pages/Home';
import Report from './pages/Report';
import Complaints from './pages/Complaints';
import ComplaintDetail from './pages/ComplaintDetail';
import MapPage from './pages/MapPage';
import About from './pages/About';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminComplaints from './pages/admin/AdminComplaints';
import AdminComplaintDetail from './pages/admin/AdminComplaintDetail';
import AdminMap from './pages/admin/AdminMap';
import Analytics from './pages/admin/Analytics';

export default function App() {
  return (
    <GovProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              {/* Public Citizen Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/report" element={<Report />} />
              <Route path="/complaints" element={<Complaints />} />
              <Route path="/complaints/:id" element={<ComplaintDetail />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Login />} />

              {/* Protected Municipal Administrative Routes */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/complaints"
                element={
                  <AdminRoute>
                    <AdminComplaints />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/complaints/:id"
                element={
                  <AdminRoute>
                    <AdminComplaintDetail />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/map"
                element={
                  <AdminRoute>
                    <AdminMap />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <AdminRoute>
                    <Analytics />
                  </AdminRoute>
                }
              />
            </Route>
          </Routes>
        </HashRouter>
      </AuthProvider>
    </GovProvider>
  );
}
