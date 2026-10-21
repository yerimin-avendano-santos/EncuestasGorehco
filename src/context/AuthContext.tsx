import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { errorMessage, fetchProfile } from '../lib/api';
import { normalizeEmailInput } from '../lib/format';
import type { Profile } from '../types';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  authError: string | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const applySession = useCallback(
    async (session: Session | null): Promise<string | null> => {
      if (!session?.user) {
        setUser(null);
        setProfile(null);
        return null;
      }

      const loadedProfile = await fetchProfile(session.user.id);
      if (!loadedProfile) {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        const message =
          'Tu usuario no tiene un perfil asociado. Solicita al administrador que revise tu cuenta.';
        setAuthError(message);
        return message;
      }

      if (!loadedProfile.activo) {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        const message =
          'Tu cuenta está desactivada. Comunícate con el administrador del estudio.';
        setAuthError(message);
        return message;
      }

      setUser(session.user);
      setProfile(loadedProfile);
      setAuthError(null);
      return null;
    },
    [],
  );

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        await applySession(data.session);
      } catch (error) {
        if (mounted) setAuthError(errorMessage(error));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        if (session?.user) {
          void applySession(session).finally(() => {
            if (mounted) setLoading(false);
          });
        } else {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      },
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setAuthError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmailInput(email),
        password,
      });
      if (error) {
        throw new Error(
          error.message === 'Invalid login credentials'
            ? 'Correo o contraseña incorrectos.'
            : errorMessage(error),
        );
      }
      if (data.session) {
        const issue = await applySession(data.session);
        if (issue) throw new Error(issue);
      }
    },
    [applySession],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setAuthError(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const loaded = await fetchProfile(user.id);
    if (loaded) setProfile(loaded);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      authError,
      isAdmin: profile?.rol === 'admin',
      signIn,
      signOut,
      refreshProfile,
    }),
    [user, profile, loading, authError, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
