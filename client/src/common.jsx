import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from './api';

export const CATEGORIES = ['Web Development', 'Programming', 'Databases', 'Tools'];
export const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const Ctx = createContext();
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem('token')) return setReady(true);
    api('/auth/me').then(setUser).catch(() => localStorage.removeItem('token')).finally(() => setReady(true));
  }, []);

  const notify = (text, type = 'ok') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };
  const login = async (path, body) => {
    const d = await api(path, { method: 'POST', body });
    localStorage.setItem('token', d.token);
    setUser(d.user);
    return d.user;
  };
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (!ready) return <p className="center">Loading...</p>;
  return (
    <Ctx.Provider value={{ user, login, logout, notify }}>
      {children}
      {toast && <div className={`toast ${toast.type}`}>{toast.text}</div>}
    </Ctx.Provider>
  );
}

export function Guard({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
}

export function useFetch(path, dep = 0) {
  const [s, set] = useState({ loading: true });
  useEffect(() => {
    if (!path) return set({ loading: false, data: null });
    let on = true;
    set({ loading: true });
    api(path).then((data) => on && set({ data, loading: false }), (e) => on && set({ error: e.message, loading: false }));
    return () => { on = false; };
  }, [path, dep]);
  return s;
}

export const Status = ({ loading, error }) => (loading ? <p className="center">Loading...</p> : error ? <p className="error">{error}</p> : null);
export const Progress = ({ value }) => <div className="bar"><div style={{ width: value + '%' }} /></div>;
