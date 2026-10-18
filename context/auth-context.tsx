'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  handleSessionExpired: (customMessage?: string) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derived state to avoid data clumps
  const user = session?.user ?? null;
  const token = session?.access_token ?? null;

  useEffect(() => {
    const supabase = getSupabase();

    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session: currentSession }, error: sessionError }) => {
      if (sessionError) {
        setError('No se pudo recuperar la sesión.');
        setSession(null);
      } else if (currentSession) {
        setSession(currentSession);
      }
      setIsLoading(false);
    }).catch(() => {
      setError('Error al recuperar la sesión.');
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const supabase = getSupabase();

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        let msg = 'Error al iniciar sesión.';
        if (
          signInError.message?.toLowerCase().includes('invalid') ||
          signInError.message?.toLowerCase().includes('credentials') ||
          signInError.status === 400
        ) {
          msg = 'Credenciales inválidas. Compruebe el correo y la contraseña.';
        } else {
          msg = 'Error de conexión con el servicio de autenticación.';
        }
        setError(msg);
        return { success: false, error: msg };
      }

      setSession(data.session);
      setError(null);
      return { success: true };
    } catch {
      const msg = 'Error de conexión con el servicio de autenticación.';
      setError(msg);
      return { success: false, error: msg };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Limpia la sesión local aún si la llamada falla
    } finally {
      setSession(null);
      setError(null);
    }
  }, []);

  const handleSessionExpired = useCallback((customMessage?: string) => {
    setSession(null);
    setError(customMessage || 'Su sesión ha expirado o ya no es válida. Por favor, inicie sesión nuevamente.');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        token,
        isLoading,
        error,
        signIn,
        signOut,
        handleSessionExpired,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
