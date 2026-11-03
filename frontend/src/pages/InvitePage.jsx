import { useEffect, useState } from 'react';
import { ArrowRight, Link2, ShieldCheck, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, post } from '../lib/api';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';

export default function InvitePage() {
  const { token } = useParams();
  const { user, logout } = useAuth();
  const { setTeamId, setTeams } = useWorkspace();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; api(`/teams/invitation/${token}`).then((data) => { if (active) setInvite(data.invitation); }).catch((e) => setError(e.message)).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [token]);
  const accept = async () => { setBusy(true); setError(''); try { const data = await post(`/teams/invitation/${token}/accept`, {}); const teamData = await api('/teams'); setTeams(teamData.teams || []); localStorage.setItem('taskflow_team', data.teamId); setTeamId(data.teamId); navigate('/'); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  if (loading) return <div className="invite-page"><div className="invite-card"><div className="brand-mark">T</div><p>Checking your invitation…</p></div></div>;
  return <div className="invite-page"><div className="invite-card"><div className="brand-mark">T</div><div className="invite-icon"><Users size={23}/></div><span className="eyebrow">YOU'RE INVITED</span><h1>Work better,<br/>together.</h1>{invite ? <><p><strong>{invite.inviterName}</strong> invited you to join <strong>{invite.teamName}</strong> on TaskFlow.</p><div className="invite-detail"><div><span>INVITATION FOR</span><strong>{invite.email}</strong></div><div><span>WORKSPACE ROLE</span><strong className={`role-pill role-${invite.role}`}>{invite.role}</strong></div><div><span>YOUR ACCOUNT</span><strong>{user?.email}</strong></div></div>{user?.email?.toLowerCase() !== invite.email.toLowerCase() && <><div className="notice notice-error">This invitation is for {invite.email}. Sign in using that email address to accept.</div><button className="btn btn-secondary invite-accept" onClick={() => { logout(); navigate('/login', { state: { from: { pathname: `/invite/${token}` } } }); }}>Switch account</button></>}<button className="btn btn-primary invite-accept" disabled={busy || user?.email?.toLowerCase() !== invite.email.toLowerCase()} onClick={accept}>{busy ? 'Joining workspace…' : 'Accept invitation'} <ArrowRight size={16}/></button><small className="invite-expiry"><ShieldCheck size={13}/> Secure invitation · expires {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(invite.expiresAt))}</small></> : <><p>This invitation link may have expired or already been used.</p><button className="btn btn-secondary" onClick={() => navigate('/')}>Back to TaskFlow</button></>}{error && <p className="form-error">{error}</p>}<div className="invite-card-footer"><Link2 size={13}/> TaskFlow workspace invitations</div></div></div>;
}
