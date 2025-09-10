
"use client";

import { useState, useMemo, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import type { User, StatusLog, BalanceLog } from "@/lib/data";
import { collection, query, where, getDocs, Timestamp, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Loader2, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- WorkTimeLog Component (No changes needed here) ---
interface TimeLogEntry {
  user: User;
  checkIn: Date | null;
  checkOut: Date | null;
  duration: number | null;
}

function WorkTimeLog() {
  const [users, setUsers] = useState<User[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [timeLogs, setTimeLogs] = useState<TimeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(usersData);
      setLoadingUsers(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!date || loadingUsers) return;
      setLoading(true);
      const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);

      const logs: TimeLogEntry[] = await Promise.all(users.map(async (user) => {
        const qDay = query(
          collection(db, "statusLogs"),
          where("userId", "==", user.id),
          where("timestamp", ">=", Timestamp.fromDate(startOfDay)),
          where("timestamp", "<=", Timestamp.fromDate(endOfDay)),
          orderBy("timestamp", "asc")
        );
        const daySnapshot = await getDocs(qDay);
        const dayLogs = daySnapshot.docs.map(doc => ({...doc.data(), timestamp: doc.data().timestamp.toDate()}) as StatusLog);

        const onlineLog = dayLogs.find(log => log.status === 'online');
        const offlineLog = dayLogs.slice().reverse().find(log => log.status === 'offline');

        if (!onlineLog) return null;

        const checkIn = onlineLog.timestamp;
        const checkOut = offlineLog ? offlineLog.timestamp : null;
        const duration = checkIn && checkOut ? (checkOut.getTime() - checkIn.getTime()) / 3600000 : null;
        
        return { user, checkIn, checkOut, duration };
      }));
      
      setTimeLogs(logs.filter(Boolean) as TimeLogEntry[]);
      setLoading(false);
    };

    fetchLogs();
  }, [date, users, loadingUsers]);
  
  const formatDuration = (hours: number) => {
      const h = Math.floor(hours);
      const m = Math.floor((hours * 60) % 60);
      return `${h}ч ${m}м`;
  }

  return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Учет рабочего времени</CardTitle>
                <CardDescription>Просмотр активности сотрудников за выбранный день.</CardDescription>
            </div>
            <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className="w-[280px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: ru }) : <span>Выберите дату</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => setDate(d || new Date())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </CardHeader>
        <CardContent>
            {loading || loadingUsers ? <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Сотрудник</TableHead>
                            <TableHead>Время прихода</TableHead>
                            <TableHead>Время ухода</TableHead>
                            <TableHead className="text-right">Всего отработано времени</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {timeLogs.length > 0 ? (
                            timeLogs.map((log) => (
                                <TableRow key={log.user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar><AvatarImage src={log.user.avatar} /><AvatarFallback>{log.user.firstName?.[0]}{log.user.lastName?.[0]}</AvatarFallback></Avatar>
                                            <div><p className="font-medium">{log.user.firstName} {log.user.lastName}</p><p className="text-sm text-muted-foreground">{log.user.position}</p></div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{log.checkIn ? format(log.checkIn, 'HH:mm:ss') : '-'}</TableCell>
                                    <TableCell>{log.checkOut ? format(log.checkOut, 'HH:mm:ss') : '-'}</TableCell>
                                    <TableCell className="text-right font-medium">{log.duration !== null ? formatDuration(log.duration) : '-'}</TableCell>
                                </TableRow>
                            ))
                         ) : (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center">Нет данных за этот день.</TableCell></TableRow>
                         )}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
  );
}

// --- AdminAudit Component (MODIFIED) ---
type CombinedLog = (StatusLog | BalanceLog) & { logType: 'status' | 'balance' };
const INITIAL_LOAD_LIMIT = 50;
const LOAD_MORE_INCREMENT = 50;

function AdminAudit() {
    const [users, setUsers] = useState<User[]>([]);
    const [allLogs, setAllLogs] = useState<CombinedLog[]>([]);
    // MODIFIED: State for controlling the number of visible logs
    const [displayCount, setDisplayCount] = useState(INITIAL_LOAD_LIMIT);
    const [loading, setLoading] = useState(true);
    const [loadingUsers, setLoadingUsers] = useState(true);

    useEffect(() => {
        // Fetch a larger chunk of logs initially (e.g., 500) to allow for "load more"
        const LOGS_TO_FETCH = 500;

        const fetchAllData = async () => {
            // Fetch all users
            const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
                setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
                setLoadingUsers(false);
            });

            // Fetch logs
            const statusLogsQuery = query(collection(db, 'statusLogs'), orderBy('timestamp', 'desc'), limit(LOGS_TO_FETCH));
            const balanceLogsQuery = query(collection(db, 'balanceLogs'), orderBy('timestamp', 'desc'), limit(LOGS_TO_FETCH));

            const [statusSnapshot, balanceSnapshot] = await Promise.all([ getDocs(statusLogsQuery), getDocs(balanceLogsQuery) ]);
            
            const statusLogs = statusSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, timestamp: doc.data().timestamp.toDate(), logType: 'status' } as CombinedLog));
            const balanceLogs = balanceSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, timestamp: doc.data().timestamp.toDate(), logType: 'balance' } as CombinedLog));

            const combined = [...statusLogs, ...balanceLogs]
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .slice(0, LOGS_TO_FETCH);
            
            setAllLogs(combined);
            setLoading(false);

            // Return a function to unsubscribe from user listener
            return () => unsubUsers();
        };
        
        const unsubscribeUsers = fetchAllData();

        // Cleanup on component unmount
        return () => {
             unsubscribeUsers.then(unsub => unsub && unsub());
        };
    }, []);

    const getUser = (userId: string) => users.find(u => u.id === userId);

    // MODIFIED: Slice the logs based on the current display count
    const visibleLogs = allLogs.slice(0, displayCount);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Аудит действий администраторов</CardTitle>
                <CardDescription>История последних административных действий в системе.</CardDescription>
            </CardHeader>
            <CardContent>
                 {(loading || loadingUsers) ? <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : (
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Администратор</TableHead>
                                <TableHead>Действие</TableHead>
                                <TableHead>Цель</TableHead>
                                <TableHead>Детали</TableHead>
                                <TableHead className="text-right">Дата</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleLogs.length > 0 ? visibleLogs.map(log => {
                                const admin = getUser(log.adminId);
                                const targetUser = getUser(log.userId);
                                return (
                                <TableRow key={log.id}>
                                    <TableCell>{admin ? `${admin.firstName} ${admin.lastName}` : 'Система'}</TableCell>
                                    <TableCell>{log.logType === 'status' ? 'Изменение статуса' : (log.action === 'add' ? 'Начисление баллов' : 'Списание баллов')}</TableCell>
                                    <TableCell>{targetUser ? `${targetUser.firstName} ${targetUser.lastName}` : 'N/A'}</TableCell>
                                    <TableCell>
                                        {log.logType === 'status' && <StatusBadge status={log.status} />}
                                        {log.logType === 'balance' && (
                                            <span className={log.action === 'add' ? 'text-green-500' : 'text-red-500'}>
                                                {log.action === 'add' ? '+' : '-'}{log.points} баллов. {log.comment && `(${log.comment})`}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">{format(log.timestamp, 'dd.MM.yyyy HH:mm')}</TableCell>
                                </TableRow>
                                )
                            }) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">Действия отсутствуют.</TableCell></TableRow>
                            )}
                        </TableBody>
                     </Table>
                 )}
            </CardContent>
            {/* MODIFIED: Add a footer with a "Show More" button */}
            {allLogs.length > displayCount && (
                <CardFooter className="flex justify-center py-4">
                    <Button variant="outline" onClick={() => setDisplayCount(prev => prev + LOAD_MORE_INCREMENT)}>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Показать еще
                    </Button>
                </CardFooter>
            )}
        </Card>
    )
}


export default function AnalyticsPage() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Tabs defaultValue="work-time">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="work-time">Учет рабочего времени</TabsTrigger>
          <TabsTrigger value="admin-audit">Аудит администраторов</TabsTrigger>
        </TabsList>
        <TabsContent value="work-time" className="mt-6">
          <WorkTimeLog />
        </TabsContent>
        <TabsContent value="admin-audit" className="mt-6">
          <AdminAudit />
        </TabsContent>
      </Tabs>
    </div>
  );
}
