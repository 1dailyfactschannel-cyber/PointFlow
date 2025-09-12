
// Определение основного типа данных для пользователя
export interface User {
    id: string; // Уникальный идентификатор, соответствует UID из Firebase Auth
    firstName: string; // Имя
    lastName: string; // Фамилия
    email: string; // Электронная почта
    role: 'admin' | 'employee'; // Роль в системе
    position: string; // Должность
    status: Status; // Текущий статус
    statusComment?: string; // Комментарий к статусу
    balance: number; // Баланс баллов
    avatar: string; // URL аватара
    telegram?: string; // Ник в Telegram
    isRemote?: boolean; // Работает ли сотрудник удаленно
    disabled?: boolean; // Заблокирован ли пользователь
}

// Определение возможных статусов сотрудника
export type Status = 'online' | 'offline' | 'vacation' | 'sick_leave';

// Определение типа для логов смены статуса
export interface StatusLog {
    id: string;
    userId: string; // ID пользователя, чей статус изменился
    adminId: string; // ID администратора, который изменил статус
    status: Status; // Новый статус
    timestamp: Date; // Временная метка изменения
}

// Определение типа для логов изменения баланса
export interface BalanceLog {
    id: string;
    userId: string; // ID пользователя, чей баланс изменился
    adminId: string; // ID администратора, который произвел начисление/списание
    action: 'add' | 'subtract'; // Тип операции
    points: number; // Количество баллов
    comment?: string; // Комментарий к операции
    timestamp: Date; // Временная метка операции
}

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    image: string;
    stock: number;
}

export interface PurchaseRequest {
    id: string;
    userId: string;
    productId: string;
    productName: string;
    productPrice: number;
    quantity: number;
    status: 'pending' | 'approved' | 'rejected';
    timestamp: Date;
}

export interface PurchaseRecord {
    id: string;
    user: User;
    admin: User;
    item: string;
    cost: number;
    date: any;
}