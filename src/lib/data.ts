
import { Timestamp } from "firebase/firestore";

export type Status = "online" | "offline" | "sick" | "vacation";

export type User = {
  id: string; // Changed to string for Firebase UID
  firstName: string;
  lastName: string;
  email: string;
  telegram: string;
  position: string;
  role: "admin" | "employee";
  avatar: string;
  balance: number;
  status: Status;
};

export type StatusLog = {
  id: string; // Changed to string for Firestore document ID
  userId: string;
  adminId: string;
  status: Status;
  timestamp: Date | Timestamp;
};

export type BalanceLog = {
    id: string; // Changed to string for Firestore document ID
    userId: string;
    adminId: string;
    action: 'add' | 'subtract';
    points: number;
    comment?: string;
    timestamp: Date | Timestamp;
};

export type Product = {
  id: string; // Firestore document ID
  name: string;
  description: string;
  price: number;
  image: string;
};

export type PurchaseRequestStatus = 'pending' | 'approved' | 'rejected';

export type PurchaseRequest = {
  id: string; // Firestore document ID
  userId: string;
  productId: string;
  status: PurchaseRequestStatus;
  timestamp: Date | Timestamp;
  isNew?: boolean;
}

export const products: Omit<Product, 'id'>[] = [
  {
    name: "Фирменная футболка",
    description: "Стильная футболка с логотипом компании.",
    price: 500,
    image: "https://picsum.photos/400/300?p=1",
  },
  {
    name: "Кружка-хамелеон",
    description: "Меняет цвет от горячего напитка.",
    price: 750,
    image: "https://picsum.photos/400/300?p=2",
  },
  {
    name: "Подписка на Coursera",
    description: "Месячная подписка на образовательную платформу.",
    price: 1500,
    image: "https://picsum.photos/400/300?p=3",
  },
  {
    name: "Беспроводные наушники",
    description: "Качественный звук без проводов.",
    price: 3000,
    image: "https://picsum.photos/400/300?p=4",
  },
   {
    name: "Power Bank",
    description: "Портативное зарядное устройство.",
    price: 1200,
    image: "https://picsum.photos/400/300?p=5",
  },
  {
    name: "Подарочный сертификат Ozon",
    description: "Сертификат на 2000 рублей.",
    price: 2000,
    image: "https://picsum.photos/400/300?p=6",
  },
];
