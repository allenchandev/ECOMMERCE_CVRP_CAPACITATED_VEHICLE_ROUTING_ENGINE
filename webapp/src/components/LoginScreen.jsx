import React, { useState } from 'react';
import { ShieldCheck, ShoppingBag, Lock, Mail, User, ArrowRight, CheckCircle2 } from 'lucide-react';

const DUMMY_CREDENTIALS = {
  customer: {
    name: 'Alice Munro',
    email: 'alice.munro@customer.com',
    password: 'customer123'
  },
  admin: {
    name: 'Logistics Operations Dispatcher',
    email: 'admin@ecommerce-dispatch.com',
    password: 'adminSecurePassword!'
  }
};

export default function LoginScreen({ onLogin }) {
  const [role, setRole] = useState('customer'); // 'customer' | 'admin'
  const [name, setName] = useState(DUMMY_CREDENTIALS.customer.name);
  const [email, setEmail] = useState(DUMMY_CREDENTIALS.customer.email);
  const [password, setPassword] = useState(DUMMY_CREDENTIALS.customer.password);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setName(DUMMY_CREDENTIALS[newRole].name);
    setEmail(DUMMY_CREDENTIALS[newRole].email);
    setPassword(DUMMY_CREDENTIALS[newRole].password);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const userData = {
      role,
      name: name || DUMMY_CREDENTIALS[role].name,
      email: email || DUMMY_CREDENTIALS[role].email
    };
    try {
      localStorage.setItem('cvrp_logged_in_user', JSON.stringify(userData));
    } catch (err) {}
    onLogin(userData);
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f1f5f9',
      padding: '1.5rem',
      position: 'relative'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 16,
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        border: '1px solid #e2e8f0',
        width: 480,
        maxWidth: '100%',
        padding: '2.5rem',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 14,
            background: role === 'admin'
              ? 'linear-gradient(135deg, #1a73e8 0%, #2563eb 100%)'
              : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            color: '#ffffff',
            boxShadow: role === 'admin'
              ? '0 6px 18px rgba(37, 99, 235, 0.35)'
              : '0 6px 18px rgba(16, 185, 129, 0.35)',
            marginBottom: '0.85rem'
          }}>
            {role === 'admin' ? <ShieldCheck size={28} /> : <ShoppingBag size={28} />}
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
            Bangalore E-Commerce Logistics
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
            Multi-Hub CVRP Capacitated Vehicle Routing System
          </p>
        </div>

        {/* Role Toggle Selector */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          background: '#f1f5f9',
          padding: 4,
          borderRadius: 10,
          marginBottom: '1.5rem'
        }}>
          <button
            type="button"
            onClick={() => handleRoleChange('customer')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '0.65rem',
              borderRadius: 8,
              border: 'none',
              background: role === 'customer' ? '#ffffff' : 'transparent',
              color: role === 'customer' ? '#059669' : '#64748b',
              fontWeight: 800,
              fontSize: '0.85rem',
              boxShadow: role === 'customer' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <ShoppingBag size={16} /> Customer Portal
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '0.65rem',
              borderRadius: 8,
              border: 'none',
              background: role === 'admin' ? '#ffffff' : 'transparent',
              color: role === 'admin' ? '#1a73e8' : '#64748b',
              fontWeight: 800,
              fontSize: '0.85rem',
              boxShadow: role === 'admin' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <ShieldCheck size={16} /> Admin Portal
          </button>
        </div>

        {/* Dynamic Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
              {role === 'admin' ? 'Administrator Name' : 'Customer Name'}
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
              <input
                type="text"
                required
                placeholder={role === 'admin' ? 'Operations Dispatcher' : 'Alice Munro'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem 0.6rem 2.3rem',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 8,
                  fontSize: '0.86rem'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
              <input
                type="email"
                required
                placeholder={role === 'admin' ? 'admin@ecommerce-dispatch.com' : 'alice@customer.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem 0.6rem 2.3rem',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 8,
                  fontSize: '0.86rem'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem 0.6rem 2.3rem',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 8,
                  fontSize: '0.86rem'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: role === 'admin' ? '#1a73e8' : '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '0.7rem 1.25rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: role === 'admin'
                ? '0 4px 12px rgba(26, 115, 232, 0.3)'
                : '0 4px 12px rgba(5, 150, 105, 0.3)',
              transition: 'all 0.15s'
            }}
          >
            Sign in as {role === 'admin' ? 'Admin Dispatcher' : 'Customer'} <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
