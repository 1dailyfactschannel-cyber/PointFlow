
"use client";

import { useMemo } from 'react';
import { redirect } from 'next/navigation';
import { useAuth } from '@/context/auth-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, StatusLog, BalanceLog } from '@/lib/data';
import { format, differenceInMinutes, formatDistanceStrict } from 'date-fns';
import { ru } from 'date-fns/locale';
import { StatusBadge } from '@/components/status-badge';


type UnifiedLog = (
    | ({ type: 'status' } & StatusLog) 
    | ({ type: 'balance' } & BalanceLog)
) & { admin?: User, user?: User };


// Helper function to process logs and calculate work hours
const processWorkLogs = (users: User[], statusLogs: StatusLog[]) => {
    const dailyLogs: { [key: string]: { entries: StatusLog[], arrivals: Date[], departures: Date[] } } = {};

    statusLogs.forEach(log => {
        const logDate = log.timestamp instanceof Date ? log.timestamp : log.timestamp.toDate();
        const dateKey = `${log.userId}_${format(logDate, 'yyyy-MM-dd')}`;
        if (!dailyLogs[dateKey]) {
            dailyLogs[dateKey] = { entries: [], arrivals: [], departures: [] };
        }
        dailyLogs[dateKey].entries.push(log);
        if (log.status === 'online') {
            dailyLogs[dateKey].arrivals.push(logDate);
        } else if (log.status === 'offline') {
            dailyLogs[dateKey].departures.push(logDate);
        }
    });

    const workRecords = Object.keys(dailyLogs).map(key => {
        const [userId, dateStr] = key.split('_');
        const user = users.find(u => u.id === userId);
        const { arrivals, departures } = dailyLogs[key];

        const firstArrival = arrivals.length > 0 ? new Date(Math.min(...arrivals.map(d => d.getTime()))) : null;
        const lastDeparture = departures.length > 0 ? new Date(Math.max(...departures.map(d => d.getTime()))) : null;

        let totalMinutes = 0;
        if (firstArrival && lastDeparture && lastDeparture > firstArrival) {
            totalMinutes = differenceInMinutes(lastDeparture, firstArrival);
        }

        return {
            userId: userId,
            user,
            date: dateStr,
            arrival: firstArrival,
            departure: lastDeparture,
            totalHours: totalMinutes > 0 ? (totalMinutes / 60).toFixed(2) : '0.00',
        };
    }).filter(record => record.arrival || record.departure);

    return workRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};


export default function AnalyticsPage() {
    const { user: adminUser, users, statusLogs, balanceLogs } = useAuth();

    if (!adminUser || adminUser.role !== 'admin') {
        redirect('/dashboard');
    }

    const workRecords = useMemo(() => processWorkLogs(users, statusLogs), [users, statusLogs]);

    const adminAuditLogs = useMemo(() => {
        const combinedLogs: UnifiedLog[] = [
            ...statusLogs.map(log => ({ ...log, type: 'status' as const })),
            ...balanceLogs.map(log => ({ ...log, type: 'balance' as const }))
        ];

        return combinedLogs
            .map(log => ({
                ...log,
                admin: users.find(u => u.id === log.adminId),
                user: users.find(u => u.id === log.userId)
            }))
            .sort((a, b) => {
                const dateA = a.timestamp instanceof Date ? a.timestamp : a.timestamp.toDate();
                const dateB = b.timestamp instanceof Date ? b.timestamp : b.timestamp.toDate();
                return dateB.getTime() - dateA.getTime();
            });

    }, [users, statusLogs, balanceLogs]);


    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <Tabs defaultValue="timesheet">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="timesheet">Учет рабочего времени</TabsTrigger>
                    <TabsTrigger value="audit">Аудит администраторов</TabsTrigger>
                </TabsList>
                <TabsContent value="timesheet">
                    <TimesheetTab records={workRecords} />
                </TabsContent>
                <TabsContent value="audit">
                    <AdminAuditTab logs={adminAuditLogs} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function TimesheetTab({ records }: { records: ReturnType<typeof processWorkLogs> }) {
    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>Учет рабочего времени</CardTitle>
                <CardDescription>
                    Время прихода, ухода и общее количество отработанных часов по сотрудникам.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="w-full overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Сотрудник</TableHead>
                            <TableHead>Дата</TableHead>
                            <TableHead>Приход</TableHead>
                            <TableHead>Уход</TableHead>
                            <TableHead className="text-right">Отработано (часы)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {records.length > 0 ? records.map((record, index) => (
                            <TableRow key={`${record.userId}-${record.date}-${index}`}>
                                <TableCell>
                                    {record.user && (
                                         <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9" status={record.user.status}>
                                                <AvatarImage src={record.user.avatar} />
                                                <AvatarFallback>{record.user.firstName[0]}{record.user.lastName[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="whitespace-nowrap">{record.user.firstName} {record.user.lastName}</span>
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                    {format(new Date(record.date), 'd MMMM yyyy', { locale: ru })}
                                </TableCell>
                                <TableCell className="font-mono whitespace-nowrap">
                                    {record.arrival ? format(record.arrival, 'HH:mm:ss') : '–'}
                                </TableCell>
                                <TableCell className="font-mono whitespace-nowrap">
                                    {record.departure ? format(record.departure, 'HH:mm:ss') : '–'}
                                </TableCell>
                                <TableCell className="text-right font-mono whitespace-nowrap">
                                    {record.totalHours}
                                </TableCell>
                            </TableRow>
                        )) : (
                             <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Нет данных для отображения.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function AdminAuditTab({ logs }: { logs: UnifiedLog[] }) {

    const renderLogDetails = (log: UnifiedLog) => {
        if (log.type === 'status') {
            return (
                <span>
                    Изменил статус для <strong>{log.user?.firstName} {log.user?.lastName}</strong> на <StatusBadge status={log.status} />
                </span>
            );
        }
        if (log.type === 'balance') {
            const actionText = log.action === 'add' ? 'Начислил' : 'Списал';
            const pointsText = `${log.points} ${getPointsDeclension(log.points)}`;
            return (
                <span>
                    {actionText} <strong>{pointsText}</strong> для <strong>{log.user?.firstName} {log.user?.lastName}</strong>.
                    {log.comment && <span className="text-muted-foreground italic"> Комментарий: "{log.comment}"</span>}
                </span>
            )
        }
        return null;
    }

     const getPointsDeclension = (points: number) => {
        const cases = [2, 0, 1, 1, 1, 2];
        const titles = ['балл', 'балла', 'баллов'];
        return titles[(points % 100 > 4 && points % 100 < 20) ? 2 : cases[(points % 10 < 5) ? points % 10 : 5]];
    };

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>Аудит действий администраторов</CardTitle>
                <CardDescription>
                    Полный лог всех действий, выполненных администраторами системы.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="max-h-[600px] overflow-y-auto">
                    <div className="w-full overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Администратор</TableHead>
                                <TableHead>Действие</TableHead>
                                <TableHead className="text-right">Когда</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {logs.length > 0 ? logs.map((log) => (
                               <TableRow key={`${log.type}-${log.id}`}>
                                   <TableCell className="whitespace-nowrap">
                                       {log.admin ? `${log.admin.firstName} ${log.admin.lastName}` : 'Система'}
                                   </TableCell>
                                   <TableCell>
                                        {renderLogDetails(log)}
                                   </TableCell>
                                   <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                                       {formatDistanceStrict(log.timestamp, new Date(), { addSuffix: true, locale: ru })}
                                   </TableCell>
                               </TableRow>
                           )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        Действия администраторов еще не зафиксированы.
                                    </TableCell>
                                </TableRow>
                           )}
                        </TableBody>
                    </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
