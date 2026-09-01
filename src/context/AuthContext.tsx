import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  googleProvider, 
  GoogleAuthProvider,
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  type User
} from '../firebase';

// In-memory token cache (never in localStorage/sessionStorage)
let cachedGoogleAccessToken: string | null = null;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  getIdToken: () => Promise<string>;
  getGoogleAccessToken: () => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  connectGmail: () => Promise<string | null>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  hasGmailAccess: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasGmailAccess, setHasGmailAccess] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        cachedGoogleAccessToken = null;
        setHasGmailAccess(false);
      }
      setLoading(false);
    }, (err) => {
      console.error('Firebase Auth state error:', err);
      setError(err.message);
      cachedGoogleAccessToken = null;
      setHasGmailAccess(false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getIdToken = async (): Promise<string> => {
    if (!user) {
      throw new Error('User is not authenticated');
    }
    return await user.getIdToken(/* forceRefresh */ false);
  };

  const getGoogleAccessToken = async (): Promise<string | null> => {
    return cachedGoogleAccessToken;
  };

  const signInWithGoogle = async (): Promise<string | null> => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedGoogleAccessToken = credential.accessToken;
        setHasGmailAccess(true);
        return credential.accessToken;
      }
      return null;
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setError(err.message || 'Failed to sign in with Google');
      throw err;
    }
  };

  const connectGmail = async (): Promise<string | null> => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedGoogleAccessToken = credential.accessToken;
        setHasGmailAccess(true);
        return credential.accessToken;
      }
      throw new Error('Could not obtain Gmail access token from Google sign in');
    } catch (err: any) {
      console.error('Connect Gmail Error:', err);
      setError(err.message || 'Failed to connect Gmail account');
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error('Email Sign In Error:', err);
      setError(err.message || 'Invalid email or password');
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    try {
      setError(null);
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (name && cred.user) {
        await updateProfile(cred.user, { displayName: name });
        setUser({ ...cred.user, displayName: name });
      }
    } catch (err: any) {
      console.error('Sign Up Error:', err);
      setError(err.message || 'Failed to create account');
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      console.error('Reset Password Error:', err);
      setError(err.message || 'Failed to send password reset email');
      throw err;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      cachedGoogleAccessToken = null;
      setHasGmailAccess(false);
      await signOut(auth);
    } catch (err: any) {
      console.error('Logout Error:', err);
      setError(err.message);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        getIdToken,
        getGoogleAccessToken,
        signInWithGoogle,
        connectGmail,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        logout,
        hasGmailAccess,
        error,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
