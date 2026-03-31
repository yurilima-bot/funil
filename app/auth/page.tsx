'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export default function AuthPage() {
  const router = useRouter();
  const { signInWithGoogle, user, loading: authLoading } = useAuth();
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Depois do OAuth, a sessão volta em /auth. Assim que o contexto tiver usuário,
    // navegamos para a interface (/) automaticamente.
    if (!authLoading && user) {
      router.replace('/');
    }
  }, [authLoading, user, router]);

  const handleGoogle = async () => {
    setError(null);
    setOauthLoading(true);
    try {
      await signInWithGoogle();
      // O fluxo OAuth redireciona; se não redirecionar (erro), cai no catch.
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao entrar com Google';
      setError(msg);
      setOauthLoading(false);
    }
  };

  return (
    <div 
      style={{
        background: '#f7f8fa',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative elements */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '300px',
          height: '300px',
          background: '#1a56db',
          borderRadius: '9999px',
          mixBlendMode: 'multiply',
          filter: 'blur(80px)',
          opacity: 0.08,
          animation: 'blob 7s infinite'
        }}
      ></div>
      <div 
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '300px',
          height: '300px',
          background: '#059669',
          borderRadius: '9999px',
          mixBlendMode: 'multiply',
          filter: 'blur(80px)',
          opacity: 0.08,
          animation: 'blob 7s infinite 2s'
        }}
      ></div>
      <div 
        style={{
          position: 'absolute',
          bottom: 0,
          left: '80px',
          width: '300px',
          height: '300px',
          background: '#ea580c',
          borderRadius: '9999px',
          mixBlendMode: 'multiply',
          filter: 'blur(80px)',
          opacity: 0.08,
          animation: 'blob 7s infinite 4s'
        }}
      ></div>

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '420px' }}>
        {/* Card container with glassmorphism */}
        <div 
          style={{
            backdropFilter: 'blur(10px)',
            background: '#ffffff',
            border: '1px solid #e8eaed',
            borderRadius: '1.5rem',
            boxShadow: '0 4px 20px rgba(26, 86, 219, 0.08)',
            padding: '2rem',
            transition: 'all 0.3s ease'
          }}
          className="hover:border-blue-300"
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{
                background: '#1a56db',
                padding: '0.75rem',
                borderRadius: '0.75rem'
              }}>
                <svg style={{ width: '2rem', height: '2rem', color: '#ffffff' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#1a56db',
              marginBottom: '0.5rem'
            }}>
              Funil
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1.125rem', fontWeight: 300 }}>
              Acesse com sua conta Google Workspace
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={oauthLoading}
              style={{
                background: '#ffffff',
                color: '#111827',
                fontWeight: 600,
                paddingTop: '0.75rem',
                paddingBottom: '0.75rem',
                paddingLeft: '1rem',
                paddingRight: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #e8eaed',
                cursor: oauthLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                if (oauthLoading) return;
                e.currentTarget.style.borderColor = '#1a56db';
                e.currentTarget.style.background = '#eff4ff';
              }}
              onMouseLeave={(e) => {
                if (oauthLoading) return;
                e.currentTarget.style.borderColor = '#e8eaed';
                e.currentTarget.style.background = '#ffffff';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.92 32.657 29.303 36 24 36c-6.627 0-12-5.373-12-12S17.373 12 24 12c3.059 0 5.842 1.154 7.965 3.035l5.657-5.657C34.052 6.053 29.303 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.015 12 24 12c3.059 0 5.842 1.154 7.965 3.035l5.657-5.657C34.052 6.053 29.303 4 24 4c-7.682 0-14.354 4.326-17.694 10.691z"/>
                <path fill="#4CAF50" d="M24 44c5.197 0 9.86-1.99 13.409-5.231l-6.19-5.238C29.303 35.091 26.768 36 24 36c-5.281 0-9.866-3.33-11.251-7.946l-6.522 5.025C9.53 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a11.98 11.98 0 0 1-4.084 5.531l.003-.002 6.19 5.238C36.97 39.186 44 34 44 24c0-1.341-.138-2.651-.389-3.917z"/>
              </svg>
              <span>{oauthLoading ? 'Redirecionando...' : 'Entrar com Google'}</span>
            </button>

            {/* Error Message */}
            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.5rem',
                padding: '1rem',
                animation: 'fadeIn 0.3s ease'
              }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <svg style={{ width: '1.25rem', height: '1.25rem', color: '#dc2626', flexShrink: 0, marginTop: '0.125rem' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                  </svg>
                  <span style={{ color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>{error}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', marginTop: '1.5rem' }}>
            Seus dados são protegidos e criptografados
          </p>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
