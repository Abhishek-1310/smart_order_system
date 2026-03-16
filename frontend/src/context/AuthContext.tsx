// ============================================================
// Auth Context — Global Authentication State
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthUser } from '../types';
import {
  getCurrentUser,
  signIn as cognitoSignIn,
  signUp as cognitoSignUp,
  signOut as cognitoSignOut,
  confirmSignUp as cognitoConfirmSignUp,
} from '../services/auth';
import { SignUpData, SignInData, ConfirmSignUpData } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (data: SignInData) => Promise<void>;
  signUp: (data: SignUpData) => Promise<string>;
  confirmSignUp: (data: ConfirmSignUpData) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const signIn = useCallback(async (data: SignInData) => {
    const authUser = await cognitoSignIn(data);
    setUser(authUser);
  }, []);

  const signUp = useCallback(async (data: SignUpData) => {
    return await cognitoSignUp(data);
  }, []);

  const confirmSignUpFn = useCallback(async (data: ConfirmSignUpData) => {
    await cognitoConfirmSignUp(data);
  }, []);

  const signOut = useCallback(() => {
    cognitoSignOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        confirmSignUp: confirmSignUpFn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
