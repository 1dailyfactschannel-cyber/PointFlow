
"use client";

import { useMemo } from 'react';
import { redirect } from 'next/navigation';
import { useAuth } from '@/context/auth-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import type { StatusLog, BalanceLog, User } from '@/lib/data';

export default function EmployeeAnalyticsPage() {
    const { user, users, statusLogs, balanceLogs } = useAuth();

    if (!user) {
        redirect('/login');
    }

    const employeeStatusLogs = useMemo(() => {
        return statusLogs
            .filter(log => log.userId === user.id)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [statusLogs, user.id]);

    const employeeBalanceLogs = useMemo(() => {
        return balanceLogs
            .filter(log => log.userId === user.id)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [balanceLogs, user.id]);

    const getAdminName = (adminId: string) => {
        const admin = users.find(u => u.id === adminId);
        return admin ? `${admin.firstName} ${admin.lastName}` : 'Система';
    };

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <Card>
                <CardHeader>
                    <CardTitle>Ваша аналитика</CardTitle>
                    <CardDescription>История ваших статусов и операций с баллами.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="status">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="status">История статусов</TabsTrigger>
                            <TabsTrigger value="balance">Аудит баллов</TabsTrigger>
                        </TabsList>
                        <TabsContent value="status" className="mt-4">
                            <div className="max-h-96 overflow-y-auto">
                               <div className="w-full overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Статус</TableHead>
                                            <TableHead>Кем изменено</TableHead>
                                            <TableHead>Дата и время</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {employeeStatusLogs.length > 0 ? (
                                            employeeStatusLogs.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell><StatusBadge status={log.status} /></TableCell>
                                                    <TableCell className="whitespace-nowrap">{getAdminName(log.adminId)}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{log.timestamp.toLocaleString('ru-RU')}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="h-24 text-center">
                                                    История статусов пуста.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="balance" className="mt-4">
                            <div className="max-h-96 overflow-y-auto">
                                <div className="w-full overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Действие</TableHead>
                                            <TableHead>Баллы</TableHead>
                                            <TableHead>Комментарий</TableHead>
                                            <TableHead>Кем выполнено</TableHead>
                                            <TableHead>Дата и время</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {employeeBalanceLogs.length > 0 ? (
                                            employeeBalanceLogs.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="whitespace-nowrap">{log.action === 'add' ? 'Начисление' : 'Списание'}</TableCell>
                                                    <TableCell className={`font-mono whitespace-nowrap ${log.action === 'add' ? 'text-green-500' : 'text-red-500'}`}>
                                                        {log.action === 'add' ? '+' : '-'}{log.points.toLocaleString('ru-RU')}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">{log.comment || '–'}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{getAdminName(log.adminId)}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{log.timestamp.toLocaleString('ru-RU')}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center">
                                                    История операций с баллами пуста.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
