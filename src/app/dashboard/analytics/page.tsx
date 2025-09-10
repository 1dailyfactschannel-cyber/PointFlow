
"use client";

import { useState, useEffect } from 'react';
import { redirect } from 'next/navigation';
import { useAuth } from '@/context/auth-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { StatusLog, BalanceLog, User } from '@/lib/data';
import { Loader2, ChevronDown } from 'lucide-react';

const INITIAL_LOAD_LIMIT = 50;
const LOAD_MORE_INCREMENT = 50;
const MAX_LOGS_TO_FETCH = 500;

export default function EmployeeAnalyticsPage() {
    const { user } = useAuth();
    
    const [allStatusLogs, setAllStatusLogs] = useState<StatusLog[]>([]);
    const [allBalanceLogs, setAllBalanceLogs] = useState<BalanceLog[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    
    const [statusDisplayCount, setStatusDisplayCount] = useState(INITIAL_LOAD_LIMIT);
    const [balanceDisplayCount, setBalanceDisplayCount] = useState(INITIAL_LOAD_LIMIT);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        setIsLoading(true);
        let loadedCount = 0;
        const totalToLoad = 3;
        const onDataLoaded = () => {
            loadedCount++;
            if (loadedCount === totalToLoad) setIsLoading(false);
        };

        const statusLogsQuery = query(collection(db, "statusLogs"), where("userId", "==", user.id), orderBy("timestamp", "desc"), limit(MAX_LOGS_TO_FETCH));
        const unsubStatusLogs = onSnapshot(statusLogsQuery, (snapshot) => {
            const logs = snapshot.docs
                .map(doc => {
                    const data = doc.data();
                    if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                        return { ...data, id: doc.id, timestamp: data.timestamp.toDate() } as StatusLog;
                    }
                    return null;
                })
                .filter((log): log is StatusLog => log !== null);
            setAllStatusLogs(logs);
            onDataLoaded();
        }, () => onDataLoaded());

        const balanceLogsQuery = query(collection(db, "balanceLogs"), where("userId", "==", user.id), orderBy("timestamp", "desc"), limit(MAX_LOGS_TO_FETCH));
        const unsubBalanceLogs = onSnapshot(balanceLogsQuery, (snapshot) => {
            const logs = snapshot.docs
                .map(doc => {
                    const data = doc.data();
                    if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                        return { ...data, id: doc.id, timestamp: data.timestamp.toDate() } as BalanceLog;
                    }
                    return null;
                })
                .filter((log): log is BalanceLog => log !== null);
            setAllBalanceLogs(logs);
            onDataLoaded();
        }, () => onDataLoaded());
        
        const usersQuery = query(collection(db, "users"));
        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setAllUsers(users);
            onDataLoaded();
        }, () => onDataLoaded());

        return () => {
            unsubStatusLogs();
            unsubBalanceLogs();
            unsubUsers();
        };
    }, [user]);

    if (!user && !isLoading) {
        redirect('/login');
    }

    const getAdminName = (adminId: string) => {
        const admin = allUsers.find(u => u.id === adminId);
        return admin ? `${admin.firstName} ${admin.lastName}` : 'Система';
    };

    const visibleStatusLogs = allStatusLogs.slice(0, statusDisplayCount);
    const visibleBalanceLogs = allBalanceLogs.slice(0, balanceDisplayCount);

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <Card>
                <CardHeader>
                    <CardTitle>Ваша аналитика</CardTitle>
                    <CardDescription>История ваших последних статусов и операций с баллами.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                    ) : (
                        <Tabs defaultValue="status">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="status">История статусов</TabsTrigger>
                                <TabsTrigger value="balance">Аудит баллов</TabsTrigger>
                            </TabsList>

                            {/* Status Logs Tab */}
                            <TabsContent value="status" className="mt-4">
                                <Card>
                                    <CardContent className="p-0">
                                        <div className="max-h-[60vh] overflow-y-auto">
                                            <Table>
                                                <TableHeader className="sticky top-0 bg-background"><TableRow><TableHead>Статус</TableHead><TableHead>Кем изменено</TableHead><TableHead>Дата и время</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {visibleStatusLogs.length > 0 ? visibleStatusLogs.map((log) => (
                                                        <TableRow key={log.id}>
                                                            <TableCell><StatusBadge status={log.status} /></TableCell>
                                                            <TableCell className="whitespace-nowrap">{getAdminName(log.adminId)}</TableCell>
                                                            <TableCell className="whitespace-nowrap">{log.timestamp.toLocaleString('ru-RU')}</TableCell>
                                                        </TableRow>
                                                    )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">История статусов пуста.</TableCell></TableRow>}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                    {allStatusLogs.length > visibleStatusLogs.length && (
                                        <CardFooter className="flex justify-center py-4">
                                            <Button variant="outline" onClick={() => setStatusDisplayCount(prev => prev + LOAD_MORE_INCREMENT)}><ChevronDown className="mr-2 h-4 w-4" />Показать еще</Button>
                                        </CardFooter>
                                    )}
                                </Card>
                            </TabsContent>

                            {/* Balance Logs Tab */}
                            <TabsContent value="balance" className="mt-4">
                               <Card>
                                    <CardContent className="p-0">
                                        <div className="max-h-[60vh] overflow-y-auto">
                                            <Table>
                                                <TableHeader className="sticky top-0 bg-background"><TableRow><TableHead>Действие</TableHead><TableHead>Баллы</TableHead><TableHead>Комментарий</TableHead><TableHead>Кем выполнено</TableHead><TableHead>Дата и время</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {visibleBalanceLogs.length > 0 ? visibleBalanceLogs.map((log) => (
                                                        <TableRow key={log.id}>
                                                            <TableCell className="whitespace-nowrap">{log.action === 'add' ? 'Начисление' : 'Списание'}</TableCell>
                                                            <TableCell className={`font-mono whitespace-nowrap ${log.action === 'add' ? 'text-green-500' : 'text-red-500'}`}>{log.action === 'add' ? '+' : '-'}{log.points.toLocaleString('ru-RU')}</TableCell>
                                                            <TableCell className="text-muted-foreground">{log.comment || '–'}</TableCell>
                                                            <TableCell className="whitespace-nowrap">{getAdminName(log.adminId)}</TableCell>
                                                            <TableCell className="whitespace-nowrap">{log.timestamp.toLocaleString('ru-RU')}</TableCell>
                                                        </TableRow>
                                                    )) : <TableRow><TableCell colSpan={5} className="h-24 text-center">История операций с баллами пуста.</TableCell></TableRow>}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                    {allBalanceLogs.length > visibleBalanceLogs.length && (
                                       <CardFooter className="flex justify-center py-4">
                                            <Button variant="outline" onClick={() => setBalanceDisplayCount(prev => prev + LOAD_MORE_INCREMENT)}><ChevronDown className="mr-2 h-4 w-4" />Показать еще</Button>
                                        </CardFooter>
                                    )}
                                </Card>
                            </TabsContent>
                        </Tabs>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
