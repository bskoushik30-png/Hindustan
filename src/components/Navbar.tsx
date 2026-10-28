import React, { useState } from 'react';
import {
  Calculator,
  LayoutDashboard,
  FileSpreadsheet,
  Settings,
  Database,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SupabaseConfigModal } from './SupabaseConfigModal';

interface NavbarProps {
  currentView: 'dashboard' | 'calculator' | 'history' | 'settings';
  onNavigate: (view: 'dashboard' | 'calculator' | 'history' | 'settings') => void;
  activeSheetName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, activeSheetName }) => {
  const { user, isSupabaseConnected, switchDemoUser } = useAuth();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <>
      <header
        className="no-print"
        style={{
          backgroundColor: '#0c1811',
          borderBottom: '1px solid var(--border-medium)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4)'
        }}
      >
        <div
          style={{
            maxWidth: '1440px',
            margin: '0 auto',
            padding: '0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          {/* Logo & Brand */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer' }}
            onClick={() => onNavigate('dashboard')}
          >
            <img
              src="/logo-icon-transparent.png"
              alt="Hindustan Saw Mill Logo"
              style={{
                width: '42px',
                height: '42px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5))'
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, letterSpacing: '0.02em', color: '#ffffff', textTransform: 'uppercase' }}>
                  HINDUSTAN <span style={{ color: 'var(--amber-400)', fontSize: '0.9rem', fontWeight: 700 }}>SAW MILL</span>
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor: 'rgba(217, 155, 38, 0.18)',
                    border: '1px solid rgba(217, 155, 38, 0.35)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: 'var(--amber-300)'
                  }}
                >
                  SINCE 1971
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.02em' }}>
                Wood Industries &bull; Precision CFT &amp; SQFT Calculator
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              className={`btn btn-sm ${currentView === 'dashboard' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onNavigate('dashboard')}
            >
              <LayoutDashboard size={16} /> Dashboard
            </button>

            <button
              type="button"
              className={`btn btn-sm ${currentView === 'calculator' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onNavigate('calculator')}
            >
              <Calculator size={16} />
              {activeSheetName ? (
                <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeSheetName}
                </span>
              ) : (
                'Calculator'
              )}
            </button>

            <button
              type="button"
              className={`btn btn-sm ${currentView === 'history' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onNavigate('history')}
            >
              <FileSpreadsheet size={16} /> Saved Sheets
            </button>

            <button
              type="button"
              className={`btn btn-sm ${currentView === 'settings' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onNavigate('settings')}
            >
              <Settings size={16} /> Settings &amp; DB
            </button>
          </nav>

          {/* Status & User Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Supabase Connection Pill */}
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className={`badge ${isSupabaseConnected ? 'badge-connected' : 'badge-demo'}`}
              style={{
                cursor: 'pointer',
                border: 'none',
                padding: '0.35rem 0.65rem',
                fontSize: '0.75rem'
              }}
              title="Click to configure Supabase Cloud Database"
            >
              <Database size={13} />
              {isSupabaseConnected ? 'Supabase Live' : 'Demo Mode (Offline)'}
            </button>

            {/* User Profile / Menu */}
            {user && (
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-800)',
                      color: 'var(--primary-400)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}
                  >
                    {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
                  </div>
                  <span style={{ fontSize: '0.85rem', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.fullName || user.email.split('@')[0]}
                  </span>
                  <ChevronDown size={14} color="var(--text-muted)" />
                </button>

                {isUserMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      marginTop: '0.5rem',
                      width: '240px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-lg)',
                      padding: '0.75rem',
                      zIndex: 200
                    }}
                  >
                    <div style={{ paddingBottom: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-light)' }}>
                      <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {user.fullName}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {user.email}
                      </p>
                      <div style={{ marginTop: '0.35rem' }}>
                        <span className="badge badge-role">
                          <UserCheck size={11} /> {user.role.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {!isSupabaseConnected && switchDemoUser && (
                      <div style={{ paddingBottom: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-light)' }}>
                        <p style={{ margin: '0 0 0.35rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-subtle)' }}>
                          Switch Demo Persona:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ justifyContent: 'flex-start', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                            onClick={() => {
                              switchDemoUser('user');
                              setIsUserMenuOpen(false);
                            }}
                          >
                            Sawyer / Operator (User)
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ justifyContent: 'flex-start', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                            onClick={() => {
                              switchDemoUser('manager');
                              setIsUserMenuOpen(false);
                            }}
                          >
                            Mill Manager (Manager)
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ justifyContent: 'flex-start', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                            onClick={() => {
                              switchDemoUser('admin');
                              setIsUserMenuOpen(false);
                            }}
                          >
                            Director (Admin)
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={{ paddingTop: '0.25rem' }}>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                          backgroundColor: 'rgba(59, 135, 94, 0.12)',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(59, 135, 94, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        <UserCheck size={14} color="var(--primary-400)" />
                        <span>Open Access Mode: Any staff member can calculate, save, and export tally sheets.</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Supabase Connection Setup Modal */}
      <SupabaseConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </>
  );
};
