
"use client";

import type { ReactNode } from "react";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, collection, query, updateDoc, addDoc, serverTimestamp, writeBatch, getDoc, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { User, Status, StatusLog, BalanceLog } from "@/lib/data";

interface AuthContextType {
  user: User | null;
  users: User[];
  statusLogs: StatusLog[];
  balanceLogs: BalanceLog[];
  loading: boolean;
  updateStatus: (newStatus: Status) => void;
  updateUserStatus: (userId: string, status: Status) => void;
  updateUserBalance: (userId: string, points: number, action: 'add' | 'subtract', comment?: string) => void;
  updateUserProfile: (userId: string, data: Partial<User>) => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([]);
  const [balanceLogs, setBalanceLogs] = useState<BalanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const unSubUser = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const userData = { id: doc.id, ...doc.data() } as User;
            setUser(userData);
          } else {
            setUser(null);
          }
          setLoading(false);
        });
        return () => unSubUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (!user) return;
    
    let unsubUsers = () => {};
    let unsubStatusLogs = () => {};
    let unsubBalanceLogs = () => {};

    if (user.role === 'admin') {
      const usersQuery = query(collection(db, "users"));
      unsubUsers = onSnapshot(usersQuery, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(usersData);
      });

      const statusLogsQuery = query(collection(db, "statusLogs"));
      unsubStatusLogs = onSnapshot(statusLogsQuery, (snapshot) => {
          const logs = snapshot.docs.map(doc => {
              const data = doc.data();
              return { id: doc.id, ...data, timestamp: data.timestamp?.toDate() } as StatusLog;
          }).filter(log => log.timestamp);
          setStatusLogs(logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
      });
      
      const balanceLogsQuery = query(collection(db, "balanceLogs"));
      unsubBalanceLogs = onSnapshot(balanceLogsQuery, (snapshot) => {
          const logs = snapshot.docs.map(doc => {
              const data = doc.data();
              return { id: doc.id, ...data, timestamp: data.timestamp?.toDate() } as BalanceLog;
          }).filter(log => log.timestamp);
           setBalanceLogs(logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
      });
    } else {
        // For employees, we still need to fetch all users for things like "getAdminName"
        const usersQuery = query(collection(db, "users"));
        unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setUsers(usersData);
        });

        // Fetch user-specific logs
        const statusLogsQuery = query(collection(db, "statusLogs"), where("userId", "==", user.id));
        unsubStatusLogs = onSnapshot(statusLogsQuery, (snapshot) => {
             const logs = snapshot.docs.map(doc => {
                const data = doc.data();
                return { id: doc.id, ...data, timestamp: data.timestamp?.toDate() } as StatusLog;
            }).filter(log => log.timestamp);
            setStatusLogs(logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
        });

        const balanceLogsQuery = query(collection(db, "balanceLogs"), where("userId", "==", user.id));
        unsubBalanceLogs = onSnapshot(balanceLogsQuery, (snapshot) => {
            const logs = snapshot.docs.map(doc => {
                const data = doc.data();
                return { id: doc.id, ...data, timestamp: data.timestamp?.toDate() } as BalanceLog;
            }).filter(log => log.timestamp);
            setBalanceLogs(logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
        });
    }


    return () => {
        unsubUsers();
        unsubStatusLogs();
        unsubBalanceLogs();
    };
  }, [user]);

  const logStatusChange = async (userId: string, adminId: string, status: Status) => {
    await addDoc(collection(db, "statusLogs"), {
      userId,
      adminId,
      status,
      timestamp: serverTimestamp(),
    });
  };

  const updateStatus = async (newStatus: Status) => {
    if (!user) return;
    const userDocRef = doc(db, "users", user.id);
    await updateDoc(userDocRef, { status: newStatus });
    await logStatusChange(user.id, user.id, newStatus);
  };

  const updateUserStatus = async (userId: string, status: Status) => {
    if (!user || user.role !== 'admin') return;
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, { status });
    await logStatusChange(userId, user.id, status);
  };

  const updateUserProfile = async (userId: string, data: Partial<User>) => {
    if (!user) return;
    if (user.role === 'admin' || user.id === userId) {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, data);
    }
  };

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
        userId,
        adminId: user.id,
        action,
        points,
        comment,
        timestamp: serverTimestamp(),
      });
      
      await batch.commit();

    }, [user]);


  const value = { 
    user, 
    users,
    statusLogs,
    balanceLogs,
    loading, 
    updateStatus,
    updateUserStatus, 
    updateUserBalance,
    updateUserProfile,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
