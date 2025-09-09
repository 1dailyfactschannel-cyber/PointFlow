
"use client";

import { create } from 'zustand';

type NotificationPayload = {
  title: string;
  body: string;
};

export type StoredNotification = NotificationPayload & {
  id: number;
  timestamp: number;
  read: boolean;
};

interface NotificationState {
  notifications: StoredNotification[];
  unreadCount: number;
  lastNotification: NotificationPayload | null;
  sendNotification: (payload: NotificationPayload) => void;
  markAsRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  lastNotification: null,
  sendNotification: (payload) => {
    const newNotification: StoredNotification = {
      ...payload,
      id: Date.now(),
      timestamp: Date.now(),
      read: false,
    };
    set(state => ({ 
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
      lastNotification: payload,
    }));
  },
  markAsRead: () => {
    if (get().unreadCount === 0) return;
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },
}));
