import { HashRouter, Routes, Route } from 'react-router-dom';
import { GovProvider } from './context/GovContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import WorkerRoute from './components/WorkerRoute';
import Layout from './components/Layout';
import WorkerLayout from './components/WorkerLayout';
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
import WorkerLogin from './pages/WorkerLogin';
import WorkerHome from './pages/worker/WorkerHome';
import WorkerTasks from './pages/worker/WorkerTasks';
import WorkerTaskDetail from './pages/worker/WorkerTaskDetail';
import WorkerInProgress from './pages/worker/WorkerInProgress';
import WorkerCompleted from './pages/worker/WorkerCompleted';
import WorkerNotifications from './pages/worker/WorkerNotifications';
import WorkerProfile from './pages/worker/WorkerProfile';

export default function App() {
  return (
    <GovProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            {/* Dedicated Worker Login (Separate from Citizen/Admin) */}
            <Route path="/worker-login" element={<WorkerLogin />} />
            <Route path="/worker/login" element={<WorkerLogin />} />

            {/* Protected Field Worker Portal Routes (Separate Layout & Workflow) */}
            <Route
              element={
                <WorkerRoute>
                  <WorkerLayout />
                </WorkerRoute>
              }
            >
              <Route path="/worker" element={<WorkerHome />} />
              <Route path="/worker/tasks" element={<WorkerTasks />} />
              <Route path="/worker/tasks/:id" element={<WorkerTaskDetail />} />
              <Route path="/worker/task/:id" element={<WorkerTaskDetail />} />
              <Route path="/worker/in-progress" element={<WorkerInProgress />} />
              <Route path="/worker/completed" element={<WorkerCompleted />} />
              <Route path="/worker/notifications" element={<WorkerNotifications />} />
              <Route path="/worker/profile" element={<WorkerProfile />} />
            </Route>

            {/* Citizen & Admin Portal Routes */}
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
