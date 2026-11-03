import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Bell, ChevronDown, FolderKanban, LayoutDashboard, ListTodo, LogOut, Plus, Search, Settings, Users } from 'lucide-react';
import { api, post } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import Avatar from './Avatar';

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/tasks', label: 'All tasks', icon: ListTodo },
  { to: '/board', label: 'Board', icon: FolderKanban },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/team', label: 'Team members', icon: Users },
  { to: '/activity', label: 'Activity', icon: Activity },
];

export default function Shell() {
  const { user, logout } = useAuth();
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState(localStorage.getItem('taskflow_team') || '');
  const [team, setTeam] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showTeamMenu, setShowTeamMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    api('/teams').then((data) => {
      if (!active) return;
      const list = data.teams || [];
      setTeams(list);
      const selected = list.find((item) => item.id === teamId) || list[0];
      if (selected) { setTeamId(selected.id); localStorage.setItem('taskflow_team', selected.id); }
      else setTeamId('');
    }).catch((err) => console.error(err)).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!teamId) { setTeam(null); setProjects([]); return; }
    let active = true;
    Promise.all([api(`/teams/${teamId}`), api(`/projects/${teamId}`)]).then(([teamData, projectData]) => {
      if (!active) return;
      setTeam(teamData.team); setProjects(projectData.projects || []);
    }).catch((err) => console.error(err));
    return () => { active = false; };
  }, [teamId]);

  const refreshTeam = async () => {
    if (!teamId) return;
    const [teamData, projectData] = await Promise.all([api(`/teams/${teamId}`), api(`/projects/${teamId}`)]);
    setTeam(teamData.team); setProjects(projectData.projects || []);
  };
  const value = useMemo(() => ({ teamId, team, teams, projects, setTeamId, setTeams, refreshTeam }), [teamId, team, teams, projects]);
  const pageName = navItems.find((item) => item.to === location.pathname)?.label || (location.pathname.startsWith('/invite') ? 'Invitation' : 'Workspace');
  const submitSearch = (e) => { e.preventDefault(); navigate(`/tasks?search=${encodeURIComponent(search)}`); };

  if (loading) return <div className="app-loading"><div className="brand-mark">T</div><span>Preparing your workspace…</span></div>;
  if (!teamId) return <WorkspaceContext.Provider value={value}><div className="app-empty"><div className="brand-mark">T</div><h2>No workspace found</h2><p>Create a workspace to start organizing your team's work.</p><button className="btn btn-primary" onClick={async () => { const d = await post('/teams', { name: `${user.name.split(' ')[0]}'s workspace` }); setTeams((t) => [...t, d.team]); setTeamId(d.team.id); localStorage.setItem('taskflow_team', d.team.id); }}>Create workspace</button></div></WorkspaceContext.Provider>;

  return <WorkspaceContext.Provider value={value}>
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row"><div className="brand-mark">T</div><span className="brand-name">taskflow<span>.</span></span></div>
        <div className="workspace-switcher-wrap">
          <button className="workspace-switcher" onClick={() => setShowTeamMenu((v) => !v)}>
            <span className="workspace-avatar">{(team?.name || 'W').slice(0, 1).toUpperCase()}</span>
            <span className="workspace-copy"><strong>{team?.name || 'Workspace'}</strong><small>Free workspace</small></span>
            <ChevronDown size={15}/>
          </button>
          {showTeamMenu && <div className="team-menu">{teams.map((item) => <button key={item.id} onClick={() => { setTeamId(item.id); localStorage.setItem('taskflow_team', item.id); setShowTeamMenu(false); }}><span className="workspace-avatar mini">{item.name.slice(0, 1).toUpperCase()}</span><span>{item.name}</span>{item.id === teamId && <span className="selected-dot"/>}</button>)}<button className="create-workspace" onClick={async () => { const name = window.prompt('Name your workspace'); if (name?.trim()) { try { const d = await post('/teams', { name }); setTeams((items) => [...items, d.team]); setTeamId(d.team.id); localStorage.setItem('taskflow_team', d.team.id); setShowTeamMenu(false); } catch (err) { window.alert(err.message); } } }}><Plus size={14}/> Create workspace</button></div>}
        </div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="primary-nav">{navItems.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={17}/><span>{label}</span></NavLink>)}</nav>
        <div className="sidebar-label projects-label">YOUR PROJECTS <button onClick={() => navigate('/projects')} aria-label="Add project"><Plus size={14}/></button></div>
        <div className="sidebar-projects">{projects.filter((p) => !p.archived).slice(0, 5).map((project) => <button key={project.id} className="project-nav" onClick={() => navigate(`/tasks?project=${project.id}`)}><span className={`project-dot ${project.color}`}/><span>{project.name}</span></button>)}{projects.filter((p) => !p.archived).length === 0 && <small className="sidebar-hint">Projects will appear here.</small>}</div>
        <div className="sidebar-spacer"/>
        <div className="sidebar-bottom-links"><button onClick={() => navigate('/settings')}><Settings size={16}/> Settings</button></div>
        <div className="sidebar-profile"><Avatar user={user}/><div className="profile-copy"><strong>{user?.name}</strong><small>{user?.email}</small></div><button className="icon-btn subtle" onClick={logout} title="Sign out"><LogOut size={16}/></button></div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div className="mobile-brand"><div className="brand-mark">T</div><span>taskflow.</span></div><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{pageName}</strong></div><div className="topbar-actions"><form className="global-search" onSubmit={submitSearch}><Search size={16}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks, projects…"/></form><button className="top-icon-btn" aria-label="View activity" title="View activity" onClick={() => navigate('/activity')}><Bell size={17}/></button><div className="top-divider"/><Avatar user={user} size="sm"/></div></header>
        <div className="page-scroll"><Outlet/></div>
      </main>
    </div>
  </WorkspaceContext.Provider>;
}
