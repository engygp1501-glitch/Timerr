import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Zap, Mail, Lock, User, ArrowRight, Shield } from 'lucide-react';

export default function LoginPage() {
  const { login, signup } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignup) {
        await signup(email, password, name, role);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(
        err.code === 'auth/user-not-found' ? 'No account found with this email' :
        err.code === 'auth/wrong-password' ? 'Incorrect password' :
        err.code === 'auth/invalid-credential' ? 'Invalid email or password' :
        err.code === 'auth/email-already-in-use' ? 'Email already registered' :
        err.code === 'auth/weak-password' ? 'Password must be at least 6 characters' :
        err.message || 'Authentication failed'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-bg">
      <div className="animate-fadeIn" style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '48px',
        width: '100%',
        maxWidth: '440px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <img src="/logo.png" alt="Priorix Logo" style={{
            width: '64px', height: '64px', borderRadius: '16px',
            display: 'block', margin: '0 auto 16px auto',
            boxShadow: '0 8px 24px rgba(79,70,229,0.15)',
            objectFit: 'contain', background: '#fff'
          }} />
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1e293b', marginBottom: '4px' }}>
            <span className="metallic-text" style={{ fontSize: '22px' }}>Priorix</span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Intelligent Work Prioritization</p>
        </div>

        {/* Toggle */}
        <div style={{
          display: 'flex', gap: '0', marginBottom: '28px',
          background: '#f1f5f9', borderRadius: '10px', padding: '4px'
        }}>
          {['Sign In', 'Sign Up'].map((label, i) => (
            <button key={label}
              onClick={() => { setIsSignup(i === 1); setError(''); }}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
                background: (i === 0 ? !isSignup : isSignup) ? '#fff' : 'transparent',
                color: (i === 0 ? !isSignup : isSignup) ? '#4f46e5' : '#94a3b8',
                boxShadow: (i === 0 ? !isSignup : isSignup) ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >{label}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isSignup && (
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input className="form-input" type="text" placeholder="Full Name" value={name}
                onChange={e => setName(e.target.value)} required style={{ paddingLeft: '44px' }} />
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input className="form-input" type="email" placeholder="Email address" value={email}
              onChange={e => setEmail(e.target.value)} required style={{ paddingLeft: '44px' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input className="form-input" type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} required minLength={6} style={{ paddingLeft: '44px' }} />
          </div>
          {isSignup && (
            <div style={{ position: 'relative' }}>
              <Shield size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <select className="form-select" value={role} onChange={e => setRole(e.target.value)} style={{ paddingLeft: '44px' }}>
                <option value="admin">Admin</option>
                <option value="employee">Employee</option>
              </select>
            </div>
          )}

          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: '10px',
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#dc2626', fontSize: '13px'
            }}>{error}</div>
          )}

          <button type="submit" disabled={loading} className="btn-primary"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', padding: '14px', fontSize: '15px',
              opacity: loading ? 0.7 : 1, marginTop: '4px'
            }}>
            {loading ? (
              <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
            ) : (
              <>{isSignup ? 'Create Account' : 'Sign In'}<ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: '#94a3b8' }}>
          Employee default password: <code style={{ color: '#4f46e5', background: '#eef2ff', padding: '2px 6px', borderRadius: '4px' }}>Priorix@123</code>
        </p>

        {/* Demo Accounts */}
        {!isSignup && (
          <div className="animate-fadeIn delay-100" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px dashed #e2e8f0' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', textAlign: 'center' }}>Hackathon Demo Quick Login</p>
            
            <button 
              type="button"
              onClick={() => { setEmail('admin@priorix.com'); setPassword('Priorix@123'); }}
              style={{
                background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '16px',
                padding: '8px 16px', fontSize: '12px', fontWeight: '700', color: '#4f46e5',
                cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px',
                width: '100%', justifyContent: 'center', marginBottom: '10px'
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#4f46e5'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.color = '#4f46e5'; }}
            >
              <Shield size={14} /> Admin Dashboard (Rohit)
            </button>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {[
                { name: 'Vikram', email: 'vikram@priorix.com' },
                { name: 'Rahul', email: 'rahul@priorix.com' },
                { name: 'Sneha', email: 'sneha@priorix.com' },
                { name: 'Arjun', email: 'arjun@priorix.com' },
                { name: 'Priya', email: 'priya@priorix.com' }
              ].map((emp, i) => (
                <button 
                  key={i} type="button"
                  onClick={() => { setEmail(emp.email); setPassword('Priorix@123'); }}
                  style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px',
                    padding: '6px 12px', fontSize: '12px', fontWeight: '600', color: '#475569',
                    cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.borderColor = '#c7d2fe'; e.currentTarget.style.color = '#4f46e5'; }}
                  onMouseOut={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
                >
                  <User size={12} /> {emp.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
