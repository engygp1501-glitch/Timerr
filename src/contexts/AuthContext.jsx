import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { ref, set, get, onValue } from 'firebase/database';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, name, role = 'employee') {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await set(ref(db, `users/${userCredential.user.uid}`), {
      email,
      name,
      role,
      createdAt: Date.now()
    });
    return userCredential;
  }

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    setUserProfile(null);
    return signOut(auth);
  }

  async function addEmployee(email, name) {
    // Create a secondary app to avoid signing out the admin
    const { initializeApp, deleteApp } = await import('firebase/app');
    const { getAuth, createUserWithEmailAndPassword: createUser } = await import('firebase/auth');

    const secondaryApp = initializeApp(
      auth.app.options,
      'secondary-' + Date.now()
    );
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const defaultPassword = 'Priorix@123';
      const userCred = await createUser(secondaryAuth, email, defaultPassword);
      await set(ref(db, `users/${userCred.user.uid}`), {
        email,
        name,
        role: 'employee',
        createdAt: Date.now()
      });
      await deleteApp(secondaryApp);
      return userCred.user.uid;
    } catch (error) {
      await deleteApp(secondaryApp);
      throw error;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userRef = ref(db, `users/${user.uid}`);
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setUserProfile({ uid: user.uid, ...snapshot.val() });
          }
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    login,
    signup,
    logout,
    addEmployee,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
