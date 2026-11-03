import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Shell from './components/Shell';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import BoardPage from './pages/BoardPage';
import ProjectsPage from './pages/ProjectsPage';
import TeamPage from './pages/TeamPage';
import ActivityPage from './pages/ActivityPage';
import SettingsPage from './pages/SettingsPage';
import InvitePage from './pages/InvitePage';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="app-loading"><div className="brand-mark">T</div><span>Loading your account…</span></div>;
  return user ? children : <Navigate to="/login" state={{ from: location }} replace/>;
}
function RouterView() {
  return <Routes>
    <Route path="/login" element={<AuthPage/>}/>
    <Route path="/register" element={<AuthPage register/>}/>
    <Route element={<RequireAuth><Shell/></RequireAuth>}>
      <Route index element={<DashboardPage/>}/>
      <Route path="tasks" element={<TasksPage/>}/>
      <Route path="board" element={<BoardPage/>}/>
      <Route path="projects" element={<ProjectsPage/>}/>
      <Route path="team" element={<TeamPage/>}/>
      <Route path="activity" element={<ActivityPage/>}/>
      <Route path="settings" element={<SettingsPage/>}/>
      <Route path="invite/:token" element={<InvitePage/>}/>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>;
}
export default function App() { return <AuthProvider><RouterView/></AuthProvider>; }
