
"use client";

import { useState, useMemo } from "react";
import { redirect } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Timestamp } from "firebase/firestore";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogClose,
    DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Send, Edit2 } from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import { StatusBadge } from "@/components/status-badge";
import type { User, Status, StatusLog, BalanceLog } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

const statusOptions: { value: Status; label: string }[] = [
    { value: "online", label: "В сети" },
    { value: "offline", label: "Не в сети" },
    { value: "sick", label: "Больничный" },
    { value: "vacation", label: "Отпуск" },
];

const employeeProfileSchema = z.object({
  firstName: z.string().min(1, "Имя обязательно."),
  lastName: z.string().min(1, "Фамилия обязательна."),
  position: z.string().min(1, "Должность обязательна."),
  email: z.string().email("Неверный формат email."),
  role: z.enum(["admin", "employee"]),
  telegram: z.string().optional(),
});


export default function EmployeesPage() {
    const { user: adminUser, users, updateUserStatus, updateUserProfile } = useAuth();
    const [selectedEmployeeForAudit, setSelectedEmployeeForAudit] = useState<User | null>(null);
    const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState<User | null>(null);
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const { toast } = useToast();

    if (!adminUser || adminUser.role !== 'admin') {
        redirect('/dashboard');
    }

    const handleOpenAudit = (employee: User) => {
        setSelectedEmployeeForAudit(employee);
        setIsAuditOpen(true);
    };
    
    const handleCloseAudit = () => {
        setIsAuditOpen(false);
        setSelectedEmployeeForAudit(null);
    }
    
    const handleOpenEdit = (employee: User) => {
        setSelectedEmployeeForEdit(employee);
        setIsEditOpen(true);
    };

    const handleCloseEdit = () => {
        setIsEditOpen(false);
        setSelectedEmployeeForEdit(null);
    };

    const handleProfileUpdate = (userId: string, data: Partial<User>) => {
        updateUserProfile(userId, data);
        toast({ title: "Профиль сотрудника обновлен" });
        handleCloseEdit();
    };

    return (
        <>
            <div className="container mx-auto py-8 px-4 md:px-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Управление сотрудниками</CardTitle>
                        <CardDescription>Просмотр информации и управление статусами сотрудников.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <div className="w-full overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Сотрудник</TableHead>
                                    <TableHead>Должность</TableHead>
                                    <TableHead className="text-center">Статус</TableHead>
                                    <TableHead className="text-right">Действия</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="cursor-pointer hover:underline" onClick={() => handleOpenAudit(user)}>
                                            <div className="flex items-center gap-3">
                                                <Avatar status={user.status}>
                                                    <AvatarImage src={user.avatar} />
                                                    <AvatarFallback>{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium whitespace-nowrap">{user.firstName} {user.lastName}</span>
                                                    {user.telegram && (
                                                        <a 
                                                            href={`https://t.me/${user.telegram.replace('@', '')}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-muted-foreground hover:text-primary transition-colors"
                                                            aria-label="Telegram"
                                                        >
                                                            <Send className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground whitespace-nowrap">{user.position}</TableCell>
                                        <TableCell className="text-center">
                                            <StatusBadge status={user.status} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                           <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Действия</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenuItem onSelect={() => handleOpenEdit(user)}>
                                                        <Edit2 className="mr-2 h-4 w-4" />
                                                        Редактировать
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                     {statusOptions.map(option => (
                                                        <DropdownMenuItem 
                                                            key={option.value} 
                                                            onSelect={() => updateUserStatus(user.id, option.value)}
                                                            disabled={user.status === option.value}
                                                        >
                                                            {option.label}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            {selectedEmployeeForAudit && (
                <EmployeeAuditDialog 
                    isOpen={isAuditOpen} 
                    onClose={handleCloseAudit} 
                    employee={selectedEmployeeForAudit} 
                />
            )}
            {selectedEmployeeForEdit && (
                <EmployeeEditDialog 
                    isOpen={isEditOpen} 
                    onClose={handleCloseEdit} 
                    employee={selectedEmployeeForEdit}
                    onSave={handleProfileUpdate}
                />
            )}
        </>
    );
}

function EmployeeEditDialog({ isOpen, onClose, employee, onSave }: { isOpen: boolean, onClose: () => void, employee: User, onSave: (userId: string, data: Partial<User>) => void }) {
  const form = useForm<z.infer<typeof employeeProfileSchema>>({
    resolver: zodResolver(employeeProfileSchema),
    values: {
      firstName: employee.firstName,
      lastName: employee.lastName,
      position: employee.position,
      email: employee.email,
      role: employee.role,
      telegram: employee.telegram || "",
    },
  });

  const onSubmit = (values: z.infer<typeof employeeProfileSchema>) => {
    onSave(employee.id, values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать профиль</DialogTitle>
          <DialogDescription>
            Изменение данных для {employee.firstName} {employee.lastName}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem><FormLabel>Имя</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem><FormLabel>Фамилия</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
            </div>
            <FormField control={form.control} name="position" render={({ field }) => (
                <FormItem><FormLabel>Должность</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                    <FormLabel>Роль</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Выберите роль" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="employee">Сотрудник</SelectItem>
                            <SelectItem value="admin">Администратор</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="telegram" render={({ field }) => (
                <FormItem><FormLabel>Telegram</FormLabel><FormControl><Input {...field} placeholder="@username" /></FormControl><FormMessage /></FormItem>
            )}/>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
              <Button type="submit">Сохранить</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


function EmployeeAuditDialog({ isOpen, onClose, employee }: { isOpen: boolean, onClose: () => void, employee: User }) {
    const { users, statusLogs, balanceLogs } = useAuth();

    const employeeStatusLogs = useMemo(() => {
        return statusLogs
            .filter(log => log.userId === employee.id)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [statusLogs, employee.id]);

    const employeeBalanceLogs = useMemo(() => {
        return balanceLogs
            .filter(log => log.userId === employee.id)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [balanceLogs, employee.id]);

    const getAdminName = (adminId: string) => {
        const admin = users.find(u => u.id === adminId);
        return admin ? `${admin.firstName} ${admin.lastName}` : 'Система';
    }
    
    const formatTimestamp = (timestamp: Date | Timestamp) => {
        const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
        return date.toLocaleString('ru-RU');
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Аудит: {employee.firstName} {employee.lastName}</DialogTitle>
                    <DialogDescription>{employee.position}</DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="status">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="status">Аудит статусов</TabsTrigger>
                        <TabsTrigger value="balance">Аудит баллов</TabsTrigger>
                    </TabsList>
                    <TabsContent value="status" className="mt-4">
                        <AuditTableLogs<StatusLog> 
                            logs={employeeStatusLogs}
                            headers={["Статус", "Кем выполнено", "Дата и время"]}
                            renderRow={(log) => (
                                <>
                                    <TableCell><StatusBadge status={log.status} /></TableCell>
                                    <TableCell>{getAdminName(log.adminId)}</TableCell>
                                    <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                                </>
                            )}
                        />
                    </TabsContent>
                    <TabsContent value="balance" className="mt-4">
                         <AuditTableLogs<BalanceLog> 
                            logs={employeeBalanceLogs}
                            headers={["Действие", "Баллы", "Комментарий", "Кем выполнено", "Дата и время"]}
                            renderRow={(log) => (
                                <>
                                    <TableCell>{log.action === 'add' ? 'Начисление' : 'Списание'}</TableCell>
                                    <TableCell className={`font-mono ${log.action === 'add' ? 'text-green-500' : 'text-red-500'}`}>
                                        {log.action === 'add' ? '+' : '-'}{log.points.toLocaleString('ru-RU')}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{log.comment || '–'}</TableCell>
                                     <TableCell>{getAdminName(log.adminId)}</TableCell>
                                    <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                                </>
                            )}
                        />
                    </TabsContent>
                </Tabs>
                 <DialogClose asChild>
                    <Button type="button" variant="outline" className="mt-4">Закрыть</Button>
                </DialogClose>
            </DialogContent>
        </Dialog>
    )
}

function AuditTableLogs<T extends {id: string}>({ logs, headers, renderRow }: { logs: T[], headers: string[], renderRow: (log: T) => React.ReactNode }) {
    return (
        <div className="max-h-96 overflow-y-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        {headers.map(header => <TableHead key={header}>{header}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs.length > 0 ? (
                        logs.map((log) => (
                            <TableRow key={log.id}>
                                {renderRow(log)}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={headers.length} className="h-24 text-center">
                                Записи отсутствуют.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
