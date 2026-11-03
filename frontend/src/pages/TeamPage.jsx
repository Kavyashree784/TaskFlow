import { useState } from 'react';
import { Check, Copy, Crown, MailPlus, ShieldCheck, UserPlus, Users, X } from 'lucide-react';
import { post, remove } from '../lib/api';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';

export default function TeamPage() {
  const { teamId, team, refreshTeam } = useWorkspace();
  const { user } = useAuth();
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const myRole = team?.members?.find((m) => m.user.id === user?.id)?.role;
  const canManage = ['owner', 'admin'].includes(myRole);
  const invite = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { const data = await post(`/teams/${teamId}/invitations`, { email, role }); setInviteLink(`${window.location.origin}/invite/${data.invitation.token}`); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const copyLink = async () => { try { await navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setError('Clipboard access is unavailable. Copy the invitation link manually.'); } };
  const removeMember = async (member) => { if (!window.confirm(`Remove ${member.user.name} from this workspace?`)) return; try { await remove(`/teams/${teamId}/members/${member.user.id}`); await refreshTeam(); } catch (e) { setError(e.message); } };
  return <div className="page-content">
    <div className="page-heading"><div><span className="eyebrow">BETTER TOGETHER</span><h1>Team members</h1><p>Manage the people who make this workspace happen.</p></div>{canManage && <button className="btn btn-primary" onClick={() => { setShowInvite(true); setInviteLink(''); setEmail(''); setError(''); }}><UserPlus size={17}/> Invite member</button>}</div>
    {error && <div className="notice notice-error">{error}</div>}
    <div className="team-hero-card"><div className="team-hero-icon"><Users size={22}/></div><div><span className="eyebrow">YOUR WORKSPACE</span><h2>{team?.name}</h2><p>{team?.members?.length || 0} people collaborating together</p></div><div className="team-hero-avatars">{team?.members?.slice(0, 5).map((m) => <Avatar key={m.user.id} user={m.user} size="md"/>)}{(team?.members?.length || 0) > 5 && <span className="avatar avatar-md more-avatar">+{team.members.length - 5}</span>}</div></div>
    <section className="surface-card members-card"><div className="section-header"><div><span className="eyebrow">THE PEOPLE</span><h2>Workspace members</h2></div><span className="member-count-pill">{team?.members?.length || 0} members</span></div><div className="member-list">{team?.members?.map((member) => <div className="member-row" key={member.user.id}><Avatar user={member.user} size="md"/><div className="member-info"><strong>{member.user.name} {member.user.id === user?.id && <span className="you-label">YOU</span>}</strong><small>{member.user.email}</small></div><span className={`role-pill role-${member.role}`}>{member.role === 'owner' ? <Crown size={12}/> : member.role === 'admin' ? <ShieldCheck size={12}/> : null}{member.role}</span>{canManage && member.user.id !== user?.id && member.role !== 'owner' && (myRole === 'owner' || member.role !== 'admin') && <button className="icon-btn member-remove" title={`Remove ${member.user.name}`} onClick={() => removeMember(member)}><X size={16}/></button>}</div>)}</div></section>
    <div className="invite-note"><span><MailPlus size={18}/></span><div><strong>Bring the right people in</strong><p>Invite teammates by email and share a secure, time-limited workspace link. Invitations expire after 7 days.</p></div></div>
    {showInvite && <Modal title={inviteLink ? 'Invitation ready' : 'Invite a teammate'} subtitle={inviteLink ? 'Share this private link with the invited person.' : 'Give a teammate access to this workspace.'} onClose={() => setShowInvite(false)}><div className="stack-form">{!inviteLink ? <form onSubmit={invite}><label className="field"><span>Email address</span><input type="email" required placeholder="teammate@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus/></label><label className="field"><span>Workspace role</span><select value={role} onChange={(e) => setRole(e.target.value)}><option value="member">Member — can work on tasks</option><option value="admin">Admin — can invite and manage members</option></select></label><div className="invite-permission-note"><ShieldCheck size={15}/> Workspace access is limited to the invited email address.</div>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={() => setShowInvite(false)}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create invitation'}</button></div></form> : <><div className="success-graphic"><Check size={24}/></div><div className="invite-destination"><small>INVITED EMAIL</small><strong>{email}</strong></div><label className="field"><span>Invitation link</span><div className="copy-input"><input readOnly value={inviteLink}/><button className="btn btn-primary btn-small" onClick={copyLink}>{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Copied' : 'Copy'}</button></div></label><p className="field-hint">Send this link to {email}. The person must sign in using that email address to accept the invitation.</p><div className="modal-actions"><button className="btn btn-secondary" onClick={() => setShowInvite(false)}>Done</button><button className="btn btn-primary" onClick={() => { setInviteLink(''); setEmail(''); }}>Invite another</button></div></>}</div></Modal>}
  </div>;
}
