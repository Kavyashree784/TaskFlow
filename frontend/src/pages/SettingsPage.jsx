import { useEffect, useState } from 'react';
import { Building2, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { api, patch } from '../lib/api';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const { teamId, team, refreshTeam, setTeamId, setTeams } = useWorkspace();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(team?.name || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const role = team?.members?.find((m) => m.user.id === user?.id)?.role;
  useEffect(() => { if (team?.name) setName(team.name); }, [team?.name]);
  const save = async (e) => { e.preventDefault(); setBusy(true); setMessage(''); setError(''); try { await patch(`/teams/${teamId}`, { name }); await refreshTeam(); setMessage('Workspace settings saved.'); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  const leave = async () => { if (!window.confirm(`Leave ${team.name}? You will lose access to its projects and tasks.`)) return; try { await api(`/teams/${teamId}/leave`, { method: 'POST', body: JSON.stringify({}) }); const result = await api('/teams'); const nextTeam = result.teams?.[0]; setTeams(result.teams || []); if (nextTeam) { localStorage.setItem('taskflow_team', nextTeam.id); setTeamId(nextTeam.id); } else { localStorage.removeItem('taskflow_team'); setTeamId(''); } navigate('/'); } catch (err) { setError(err.message); } };
  return <div className="page-content settings-page"><div className="page-heading"><div><span className="eyebrow">PREFERENCES</span><h1>Settings</h1><p>Manage your workspace and account details.</p></div></div>
    <section className="surface-card settings-section"><div className="settings-section-head"><span className="settings-icon"><Building2 size={18}/></span><div><h2>Workspace details</h2><p>Customize the name your team sees across TaskFlow.</p></div></div><form className="settings-form" onSubmit={save}><label className="field"><span>Workspace name</span><input value={name} onChange={(e) => setName(e.target.value)} minLength="2" maxLength="80" required disabled={!['owner', 'admin'].includes(role)}/></label><div className="settings-inline"><span className="role-pill role-owner"><ShieldCheck size={12}/>{role || 'member'}</span><small>{['owner', 'admin'].includes(role) ? 'You can update workspace details.' : 'Ask a workspace admin to change these details.'}</small></div>{message && <p className="form-success">{message}</p>}{error && <p className="form-error">{error}</p>}{['owner', 'admin'].includes(role) && <button className="btn btn-primary" disabled={busy || name.trim() === team?.name}>{busy ? 'Saving…' : 'Save changes'}</button>}</form></section>
    <section className="surface-card settings-section"><div className="settings-section-head"><span className="settings-icon"><UserRound size={18}/></span><div><h2>Your account</h2><p>Personal account information for this workspace.</p></div></div><div className="account-preview"><Avatar user={user} size="lg"/><div><strong>{user?.name}</strong><small>{user?.email}</small></div><span className="verified-chip"><ShieldCheck size={13}/> Account</span></div><button className="btn btn-secondary" onClick={() => { logout(); navigate('/login'); }}><LogOut size={15}/> Sign out</button></section>
    {role !== 'owner' && <section className="danger-zone"><div><h3>Leave workspace</h3><p>Remove your membership from {team?.name}. You can rejoin only with a new invitation.</p></div><button className="btn btn-danger-outline" onClick={leave}>Leave workspace</button></section>}
    <div className="settings-footnote">TaskFlow · Personal workspace settings · Your account data is stored securely in your configured database.</div>
  </div>;
}
