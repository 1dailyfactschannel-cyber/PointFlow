
"use client";

import type { ReactNode } from "react";
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, getAuth, createUserWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { doc, onSnapshot, collection, query, updateDoc, addDoc, serverTimestamp, writeBatch, getDoc, where, getDocs, setDoc, orderBy, limit, deleteField } from "firebase/firestore";
import { auth, db, initializeFirebaseServices } from "@/lib/firebase";
import type { User, Status, StatusLog, BalanceLog } from "@/lib/data";

export interface NewUserFormData extends Partial<User> {
  email: string;
  password?: string;
}

export interface UserUpdateData extends Partial<User> {
  avatarFile?: File | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmailAndPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateStatus: (newStatus: Status, comment?: string) => void;
  updateUserStatus: (userId: string, status: Status, comment?: string) => void;
  updateUserBalance: (userId: string, points: number, action: 'add' | 'subtract', comment?: string) => Promise<void>;
  updateUserProfile: (userId: string, data: UserUpdateData) => Promise<void>;
  updateUserDisabledStatus: (userId: string, disabled: boolean) => Promise<void>;
  createNewUser: (data: NewUserFormData) => Promise<void>;
  getLogsForUser: (userId: string) => Promise<{ statusLogs: StatusLog[]; balanceLogs: BalanceLog[] }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSignOut = useCallback(async () => {
    const authInstance = getAuth();
    try {
      await firebaseSignOut(authInstance);
    } catch (error) {
      console.error("Error during sign out:", error);
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const authInstance = getAuth();
    let unsubDoc: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(authInstance, async (firebaseUser) => {
      unsubDoc();

      if (firebaseUser) {
        setLoading(true);
        const userDocRef = doc(db, "users", firebaseUser.uid);

        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists() && docSnap.data().disabled) {
            await handleSignOut();
            setLoading(false);
          } else if (docSnap.exists()) {
            unsubDoc = onSnapshot(userDocRef, (snap) => {
              setUser({ id: snap.id, ...snap.data() } as User);
              setLoading(false);
            });
          } else {
            await handleSignOut();
            setLoading(false);
          }
        } catch (error) {
          console.error("Error fetching user data on auth change:", error);
          await handleSignOut();
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubDoc();
    };
  }, [handleSignOut]);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    initializeFirebaseServices();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        throw new Error('Неверный логин или пароль.');
      }
      throw new Error('Произошла ошибка при входе. Попробуйте снова.');
    }
  }, []);

  const logStatusChange = useCallback(async (userId: string, adminId: string, status: Status) => {
    await addDoc(collection(db, "statusLogs"), {
      userId,
      adminId,
      status,
      timestamp: serverTimestamp(),
    });
  }, []);

 const updateStatus = useCallback((newStatus: Status, comment?: string) => {
    if (!user) return;

    const originalUser = { ...user };
    const optimisticUser: User = { ...user, status: newStatus };
    
    if (comment !== undefined && comment !== null) {
      optimisticUser.statusComment = comment;
    } else {
      delete optimisticUser.statusComment;
    }
    
    setUser(optimisticUser);

    (async () => {
      try {
        const userDocRef = doc(db, "users", user.id);
        const dataToUpdate: { status: Status; statusComment?: string | any } = { status: newStatus };
        
        if (comment !== undefined && comment !== null) {
          dataToUpdate.statusComment = comment;
        } else {
          dataToUpdate.statusComment = deleteField();
        }
        
        await updateDoc(userDocRef, dataToUpdate);
        await logStatusChange(user.id, user.id, newStatus);
      } catch (error) {
        console.error("Status update failed, reverting:", error);
        setUser(originalUser);
      }
    })();
  }, [user, logStatusChange]);

  const updateUserStatus = useCallback((userId: string, status: Status, comment?: string) => {
      if (!user || user.role !== 'admin') {
        console.error("Permission denied: Not an admin.");
        return;
      };

      (async () => {
        try {
            const userDocRef = doc(db, "users", userId);
            const dataToUpdate: { status: Status, statusComment?: string | any } = { status: status };
            if (comment !== undefined && comment !== null) {
              dataToUpdate.statusComment = comment;
            } else {
              dataToUpdate.statusComment = deleteField();
            }
            await updateDoc(userDocRef, dataToUpdate);
            await logStatusChange(userId, user.id, status);
        } catch (error) {
            console.error(`Failed to update status for user ${userId}:`, error);
        }
      })();
  }, [user, logStatusChange]);

  const uploadAvatar = useCallback(async (file: File): Promise<string> => {
    const apiKey = "2c2eb7da53fcdf6fd713c4cc32d2a08c";
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: "POST", body: formData });
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Ошибка загрузки изображения:", errorData);
      throw new Error("Не удалось загрузить изображение. См. консоль для деталей.");
    }
    const result = await response.json();
    if (result.data && result.data.url) {
      return result.data.url;
    } else {
      console.error("Неверный формат ответа от сервиса изображений:", result);
      throw new Error("Не удалось получить URL изображения после загрузки.");
    }
  }, []);

  const updateUserProfile = useCallback(async (userId: string, data: UserUpdateData) => {
    if (!user) return;
    if (user.role === 'admin' || user.id === userId) {
      const { avatarFile, ...profileData } = data;
      let avatarUrl = data.avatar;
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile);
      }
      const finalData: Partial<User> = { ...profileData };
      if (avatarUrl) {
        finalData.avatar = avatarUrl;
      }
      if ('isRemote' in data) {
        finalData.isRemote = data.isRemote;
      }
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, finalData);
    }
  }, [user, uploadAvatar]);

  const updateUserDisabledStatus = useCallback(async (userId: string, disabled: boolean) => {
    if (!user || user.role !== 'admin') {
      throw new Error("Только администраторы могут изменять статус блокировки.");
    }
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, { disabled: disabled });
  }, [user]);

  const createNewUser = useCallback(async (data: NewUserFormData) => {
    if (!user || user.role !== 'admin') {
      throw new Error("Только администраторы могут создавать пользователей.");
    }
    if (!data.password) {
      throw new Error("Пароль обязателен для создания нового пользователя.");
    }
    const tempAppName = `temp-auth-app-${Date.now()}`;
    const firebaseConfig = auth.app.options;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);
    try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, data.email, data.password);
      const newFirebaseUser = userCredential.user;
      const newUserDocRef = doc(db, "users", newFirebaseUser.uid);
      const newUser: Omit<User, 'id'> = {
        firstName: data.firstName || '', lastName: data.lastName || '', email: data.email,
        role: data.role || 'employee', position: data.position || '', telegram: data.telegram || '',
        status: 'offline', balance: 0, avatar: `https://i.pravatar.cc/150?u=${newFirebaseUser.uid}`,
        isRemote: data.isRemote || false, disabled: false,
      };
      await setDoc(newUserDocRef, newUser);
    } finally {
      await getAuth(tempApp).signOut();
    }
  }, [user]);

  const updateUserBalance = useCallback(async (userId: string, points: number, action: 'add' | 'subtract', comment?: string) => {
    if (!user || user.role !== 'admin') return;
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) return;
    const userData = userDocSnap.data() as User;
    const currentBalance = userData.balance || 0;
    const newBalance = action === 'add' ? currentBalance + points : currentBalance - points;
    const batch = writeBatch(db);
    batch.update(userDocRef, { balance: newBalance });
    const balanceLogRef = doc(collection(db, "balanceLogs"));
    batch.set(balanceLogRef, {
      userId, adminId: user.id, action, points, comment, timestamp: serverTimestamp(),
    });
    await batch.commit();
  }, [user]);

  const getLogsForUser = useCallback(async (userId: string) => {
    if (!user || user.role !== 'admin') {
      throw new Error("Only admins can fetch user logs.");
    }
    const statusLogsQuery = query(collection(db, "statusLogs"), where("userId", "===", userId), orderBy('timestamp', 'desc'), limit(100));
    const statusLogsSnapshot = await getDocs(statusLogsQuery);
    const statusLogsData = statusLogsSnapshot.docs.map(doc => {
      const data = doc.data();
      return { id: doc.id, ...data, timestamp: data.timestamp?.toDate() } as unknown as StatusLog;
    });
    const balanceLogsQuery = query(collection(db, "balanceLogs"), where("userId", "===", userId), orderBy('timestamp', 'desc'), limit(100));
    const balanceLogsSnapshot = await getDocs(balanceLogsQuery);
    const balanceLogsData = balanceLogsSnapshot.docs.map(doc => {
      const data = doc.data();
      return { id: doc.id, ...data, timestamp: data.timestamp?.toDate() } as unknown as BalanceLog;
    });
    return { statusLogs: statusLogsData, balanceLogs: balanceLogsData };
  }, [user]);

  const value = useMemo(() => ({ 
    user, 
    loading,
    signInWithEmailAndPassword: handleSignIn,
    signOut: handleSignOut,
    updateStatus,
    updateUserStatus, 
    updateUserBalance,
    updateUserProfile,
    updateUserDisabledStatus,
    createNewUser,
    getLogsForUser,
  }), [
    user, loading, handleSignIn, handleSignOut, updateStatus, 
    updateUserStatus, updateUserBalance, updateUserProfile, 
    updateUserDisabledStatus, createNewUser, getLogsForUser
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
