import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, post } from '../lib/api';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onUnauthorized = () => { localStorage.removeItem('taskflow_token'); setUser(null); };
    window.addEventListener('taskflow:unauthorized', onUnauthorized);
    const token = localStorage.getItem('taskflow_token');
    if (!token) { setLoading(false); return () => window.removeEventListener('taskflow:unauthorized', onUnauthorized); }
    api('/auth/me').then((data) => setUser(data.user)).catch(() => { localStorage.removeItem('taskflow_token'); setUser(null); }).finally(() => setLoading(false));
    return () => window.removeEventListener('taskflow:unauthorized', onUnauthorized);
  }, []);

  const login = async (email, password) => {
    const data = await post('/auth/login', { email, password });
    localStorage.setItem('taskflow_token', data.token);
    setUser(data.user);
    return data;
  };
  const register = async (name, email, password) => {
    const data = await post('/auth/register', { name, email, password });
    localStorage.setItem('taskflow_token', data.token);
    setUser(data.user);
    return data;
  };
  const logout = () => { localStorage.removeItem('taskflow_token'); localStorage.removeItem('taskflow_team'); setUser(null); };
  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
