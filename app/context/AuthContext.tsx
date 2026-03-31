'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Domínio permitido
const ALLOWED_DOMAIN = '@grupomegalife.com';
const SESSION_COOKIE_ENDPOINT = '/api/auth/session';
const VALIDATE_ENDPOINT = '/api/auth/validate';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  error?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sessão ao carregar
    const getSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user || null);

        // Se voltou de um redirect OAuth, garante cookies + validação server-side.
        if (session) {
          await syncSessionCookies(session);
          await validateOnEdge();
        }
      } catch (error) {
        console.error('Erro ao obter sessão:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user || null);

      try {
        await syncSessionCookies(session);
        if (session) await validateOnEdge();
      } catch {
        // Se a validação falhar (ex.: domínio não permitido), limpa a sessão.
        await supabase.auth.signOut().catch(() => null);
        await syncSessionCookies(null).catch(() => null);
        setSession(null);
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  async function syncSessionCookies(nextSession: Session | null) {
    // Mantém a sessão disponível no servidor (middleware/route handlers) via cookies httpOnly.
    await fetch(SESSION_COOKIE_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(
        nextSession
          ? {
              access_token: nextSession.access_token,
              refresh_token: nextSession.refresh_token,
            }
          : { clear: true }
      ),
    });
  }

  async function validateOnEdge() {
    const res = await fetch(VALIDATE_ENDPOINT, { method: 'POST' });
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      const msg = payload?.error || 'Sessão inválida';
      throw new Error(msg);
    }
  }

  const signUp = async (email: string, password: string) => {
    // Validar domínio do email
    if (!email.endsWith(ALLOWED_DOMAIN)) {
      throw new Error('Email não permitido');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;

    // Se o projeto estiver configurado para confirmar email, pode não haver sessão imediata.
    await syncSessionCookies(data.session ?? null);
    if (data.session) await validateOnEdge();
  };

  const signIn = async (email: string, password: string) => {
    // Validar domínio do email
    if (!email.endsWith(ALLOWED_DOMAIN)) {
      throw new Error('Email não permitido');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    await syncSessionCookies(data.session ?? null);
    await validateOnEdge();
  };

  const signInWithGoogle = async () => {
    const redirectTo =
      typeof window === 'undefined'
        ? undefined
        : `${window.location.origin}/auth`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          // Google Workspace hosted domain
          hd: 'grupomegalife.com',
          prompt: 'select_account',
        },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await syncSessionCookies(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
