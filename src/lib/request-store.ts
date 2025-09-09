
"use client";

import { create } from 'zustand';
import type { PurchaseRequest } from '@/lib/data';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, serverTimestamp, Timestamp, where } from 'firebase/firestore';
import { db } from './firebase';

interface RequestStore {
  requests: PurchaseRequest[];
  products: any[]; // You might want to type this properly
  loading: boolean;
  init: (userId?: string) => () => void;
  addRequest: (newRequestData: { userId: string; productId: string; }) => Promise<void>;
  updateRequestStatus: (requestId: string, status: 'approved' | 'rejected') => Promise<void>;
}

export const useRequestStore = create<RequestStore>((set, get) => ({
  requests: [],
  products: [],
  loading: true,
  
  init: (userId?: string) => {
    const requestsQuery = userId 
      ? query(collection(db, 'purchaseRequests'), where('userId', '==', userId))
      : query(collection(db, 'purchaseRequests'));

    const productsQuery = query(collection(db, 'products'));

    const unsubRequests = onSnapshot(requestsQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: (doc.data().timestamp as Timestamp)?.toDate(),
      } as PurchaseRequest)).filter(r => r.timestamp);
      set({ requests: requests.sort((a,b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime()) });
    });

    const unsubProducts = onSnapshot(productsQuery, (snapshot) => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      set({ products });
    });

    set({ loading: false });

    return () => {
      unsubRequests();
      unsubProducts();
    };
  },

  addRequest: async (newRequestData) => {
    await addDoc(collection(db, "purchaseRequests"), {
      ...newRequestData,
      status: 'pending',
      timestamp: serverTimestamp(),
    });
  },

  updateRequestStatus: async (requestId, status) => {
    const requestRef = doc(db, 'purchaseRequests', requestId);
    await updateDoc(requestRef, { status });
  },
}));
