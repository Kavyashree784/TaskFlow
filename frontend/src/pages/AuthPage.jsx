import { useState } from 'react';
import { ArrowRight, Check, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ register = false }) {
  const { user, login, register: createAccount } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.from?.pathname || '/';
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace/>;
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      await (register ? createAccount(form.name, form.email, form.password) : login(form.email, form.password));
      navigate(returnTo, { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const fillDemo = () => setForm({ name: '', email: 'kavya@taskflow.demo', password: 'TaskFlowDemo#2026' });
  return <div className="auth-layout">
    <section className="auth-visual"><div className="auth-visual-top"><div className="brand-mark light">T</div><span className="auth-brand">taskflow<span>.</span></span><span className="auth-tagline">MAKE SPACE FOR GREAT WORK</span></div><div className="auth-visual-content"><div className="visual-eyebrow"><Sparkles size={14}/> A calmer way to get things done</div><h1>Good work<br/><em>flows</em> better<br/>together.</h1><p>Bring your people, projects and priorities into one thoughtful workspace.</p><div className="visual-product-card"><div className="visual-card-head"><span>WEEKLY OVERVIEW</span><span className="visual-card-live"><i/> LIVE</span></div><div className="visual-chart"><div className="chart-line line-one"/><div className="chart-line line-two"/><div className="chart-line line-three"/><div className="chart-bars"><i style={{height:'32%'}}/><i style={{height:'48%'}}/><i style={{height:'43%'}}/><i style={{height:'68%'}}/><i style={{height:'55%'}}/><i style={{height:'86%'}}/><i style={{height:'73%'}}/></div></div><div className="visual-card-foot"><div><strong>24</strong><small>tasks completed</small></div><div className="visual-avatar-stack"><span>K</span><span>A</span><span>P</span><span>+2</span></div></div></div></div><div className="auth-visual-footer"><span>© 2026 TaskFlow</span><span>DESIGNED FOR FOCUS</span></div></section>
    <section className="auth-panel"><div className="auth-form-wrap"><div className="auth-panel-mobile-brand"><div className="brand-mark">T</div><span>taskflow.</span></div><div className="auth-heading"><span className="eyebrow">{register ? 'GET STARTED' : 'WELCOME BACK'}</span><h2>{register ? 'Create your workspace' : 'Welcome back'}</h2><p>{register ? 'Start with a clear view of what your team is working on.' : 'Sign in to pick up right where your team left off.'}</p></div>
      <form className="auth-form" onSubmit={submit}>{register && <label className="field"><span>Your name</span><input required minLength="2" maxLength="70" autoComplete="name" placeholder="Kavya Krish" value={form.name} onChange={(e) => set('name', e.target.value)}/></label>}<label className="field"><span>Email address</span><input required type="email" autoComplete="email" placeholder="you@company.com" value={form.email} onChange={(e) => set('email', e.target.value)}/></label><label className="field"><span>Password</span><div className="password-field"><input required type={showPassword ? 'text' : 'password'} minLength={register ? 8 : 1} autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'At least 8 characters' : 'Enter your password'} value={form.password} onChange={(e) => set('password', e.target.value)}/><button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>{error && <div className="form-error auth-error">{error}</div>}<button className="btn btn-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}<ArrowRight size={17}/></button></form>
      {!register && <div className="demo-access"><div><span className="demo-icon"><ShieldCheck size={16}/></span><div><strong>Just exploring?</strong><small>Demo credentials work after you run the seed script.</small></div></div><button onClick={fillDemo}>Use demo account <ArrowRight size={14}/></button></div>}
      <div className="auth-switch">{register ? <>Already have an account? <Link to="/login" state={location.state}>Sign in</Link></> : <>New to TaskFlow? <Link to="/register" state={location.state}>Create an account</Link></>}</div><div className="auth-trust"><span><Check size={13}/> Your team, one place</span><span><Check size={13}/> Built for focus</span></div>
    </div><div className="auth-panel-footer">By continuing, you agree to our <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>.</div></section>
  </div>;
}
