import { useState } from 'react';
import { auth } from './lib/auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [authenticated, setAuthenticated] = useState(auth.isAuthenticated());

  return authenticated ? (
    <Dashboard onLogout={() => setAuthenticated(false)} />
  ) : (
    <Login onLogin={() => setAuthenticated(true)} />
  );
}
