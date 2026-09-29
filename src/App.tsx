import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GovProvider } from './context/GovContext';
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
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/report" element={<Report />} />
            <Route path="/complaints" element={<Complaints />} />
            <Route path="/complaints/:id" element={<ComplaintDetail />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/complaints" element={<AdminComplaints />} />
            <Route path="/admin/complaints/:id" element={<AdminComplaintDetail />} />
            <Route path="/admin/map" element={<AdminMap />} />
            <Route path="/admin/analytics" element={<Analytics />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </GovProvider>
  );
}
