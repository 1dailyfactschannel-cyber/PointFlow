
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Send, Edit, PlusCircle, Upload, Loader2, Edit2, Computer, ChevronDown, UserX, UserCheck } from "lucide-react";
import { useAuth, type NewUserFormData, type UserUpdateData } from "@/context/auth-provider";
import { StatusBadge } from "@/components/status-badge";
import type { User, Status, StatusLog, BalanceLog } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const employeeProfileSchema = z.object({
  firstName: z.string().min(1, "Имя обязательно."),
  lastName: z.string().min(1, "Фамилия обязательна."),
  position: z.string().min(1, "Должность обязательна."),
  email: z.string().email("Неверный формат email."),
  role: z.enum(["admin", "employee"]),
  telegram: z.string().optional(),
  avatarFile: z.instanceof(File).optional(),
  isRemote: z.boolean().optional(),
});

const newEmployeeSchema = employeeProfileSchema.extend({
    password: z.string().min(6, "Пароль должен содержать не менее 6 символов."),
}).omit({ avatarFile: true });


export default function EmployeesPage() {
    const { user: adminUser, updateUserStatus, updateUserProfile, createNewUser, updateUserDisabledStatus } = useAuth();
    const router = useRouter();
    
    const [employees, setEmployees] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);

    const [selectedEmployeeForAudit, setSelectedEmployeeForAudit] = useState<User | null>(null);
    const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState<User | null>(null);
    const [selectedEmployeeForStatus, setSelectedEmployeeForStatus] = useState<User | null>(null);
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isBlockedListOpen, setIsBlockedListOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (adminUser === undefined) return;
        if (!adminUser || adminUser.role !== 'admin') {
            router.push('/dashboard');
        } else {
            setAuthChecked(true);
        }
    }, [adminUser, router]);

    useEffect(() => {
        if (!authChecked) return;

        const q = query(collection(db, "users"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const usersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setEmployees(usersData);
            setIsLoading(false);
        }, (error) => {
            console.error("Failed to fetch users:", error);
            setIsLoading(false);
            if (error.code !== 'permission-denied' && error.code !== 'aborted') {
               toast({ variant: 'destructive', title: "Ошибка", description: "Не удалось загрузить список сотрудников." });
            }
        });

        return () => unsubscribe();
    }, [authChecked, toast]);
    
    const activeEmployees = employees.filter(emp => !emp.disabled);
    const disabledEmployees = employees.filter(emp => emp.disabled);

    if (!authChecked) {
        return <div className="flex h-[calc(100vh-80px)] items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-muted-foreground" /></div>;
    }

    const handleOpenAudit = (employee: User) => { setSelectedEmployeeForAudit(employee); setIsAuditOpen(true); };
    const handleCloseAudit = () => { setIsAuditOpen(false); setSelectedEmployeeForAudit(null); }
    
    const handleOpenEdit = (employee: User) => { setSelectedEmployeeForEdit(employee); setIsEditOpen(true); };
    const handleCloseEdit = () => { setIsEditOpen(false); setSelectedEmployeeForEdit(null); };

    const handleOpenStatus = (employee: User) => { setSelectedEmployeeForStatus(employee); setIsStatusOpen(true); };
    const handleCloseStatus = () => { setIsStatusOpen(false); setSelectedEmployeeForStatus(null); };

    const handleProfileUpdate = (userId: string, data: UserUpdateData) => {
        updateUserProfile(userId, data);
        toast({ title: "Профиль сотрудника обновлен" });
        handleCloseEdit();
    };
    
    const handleStatusUpdate = async (userId: string, status: Status, comment?: string) => {
        try {
            await updateUserStatus(userId, status, comment);
            toast({ title: "Статус сотрудника обновлен" });
            handleCloseStatus();
        } catch(e) {
            toast({ variant: "destructive", title: "Ошибка", description: "Не удалось обновить статус" });
        }
    };
    
    const handleToggleDisabled = async (userId: string, disabled: boolean) => {
        if (adminUser && userId === adminUser.id && disabled) {
            toast({ variant: 'destructive', title: "Действие запрещено", description: "Вы не можете заблокировать самого себя." });
            return;
        }
        try {
            await updateUserDisabledStatus(userId, disabled);
            toast({ title: `Сотрудник ${disabled ? 'заблокирован' : 'разблокирован'}` });
        } catch (error) {
            if (error instanceof Error) {
                toast({ variant: 'destructive', title: "Ошибка", description: error.message });
            }
        }
    };

    const handleAddEmployee = async (data: NewUserFormData) => {
        try {
            await createNewUser(data);
            toast({ title: "Сотрудник добавлен", description: `Пользователь ${data.firstName} ${data.lastName} был успешно создан.` });
            setIsAddOpen(false);
        } catch (error) {
             if (error instanceof Error) {
                toast({ variant: 'destructive', title: "Ошибка", description: error.message });
            }
        }
    };

    const renderEmployeeRow = (user: User) => (
        <TableRow key={user.id}>
            <TableCell className="cursor-pointer hover:underline py-2" onClick={() => handleOpenAudit(user)}>
                <div className="flex items-center gap-3">
                    <Avatar status={user.status}><AvatarImage src={user.avatar} className="object-cover" /><AvatarFallback>{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback></Avatar>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium whitespace-nowrap">{user.firstName} {user.lastName}</span>
                            {user.telegram && (
                                <a href={`https://t.me/${user.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-primary transition-colors" aria-label="Telegram"><Send className="h-4 w-4" /></a>
                            )}
                        </div>
                        {user.status !== 'online' && user.lastSeen && <p className="text-xs text-muted-foreground">был(а) в сети {formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true, locale: ru })}</p>}
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-muted-foreground whitespace-nowrap py-2">{user.position}</TableCell>
            <TableCell className="text-center py-2"><StatusBadge status={user.status} /></TableCell>
            <TableCell className="text-center py-2">{user.isRemote ? <Computer className="h-5 w-5 mx-auto text-muted-foreground" /> : "-"}</TableCell>
            <TableCell className="text-muted-foreground text-sm py-2 max-w-[200px] truncate">{user.statusComment || "-"}</TableCell>
            <TableCell className="text-right py-2">
            <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Действия</span></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onSelect={() => handleOpenEdit(user)}><Edit2 className="mr-2 h-4 w-4" />Редактировать</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleOpenStatus(user)}><Edit className="mr-2 h-4 w-4" />Изменить статус</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.disabled ? (
                            <DropdownMenuItem onSelect={() => handleToggleDisabled(user.id, false)} className="text-green-600 focus:text-green-700"><UserCheck className="mr-2 h-4 w-4" />Разблокировать</DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem 
                                onSelect={() => handleToggleDisabled(user.id, true)} 
                                className="text-red-600 focus:text-red-700"
                                disabled={adminUser?.id === user.id}
                            >
                                <UserX className="mr-2 h-4 w-4" />Заблокировать
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );

    return (
        <>
            <div className="container mx-auto py-8 px-4 md:px-6 space-y-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Управление сотрудниками</CardTitle>
                            <CardDescription>Просмотр информации и управление статусами активных сотрудников.</CardDescription>
                        </div>
                         <Button onClick={() => setIsAddOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Добавить сотрудника</Button>
                    </CardHeader>
                    <CardContent>
                       <div className="w-full overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Сотрудник</TableHead>
                                    <TableHead>Должность</TableHead>
                                    <TableHead className="text-center">Статус</TableHead>
                                    <TableHead className="text-center">Удаленка</TableHead>
                                    <TableHead>Комментарий к статусу</TableHead>
                                    <TableHead className="text-right">Действия</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></TableCell></TableRow>
                                ) : activeEmployees.length > 0 ? (
                                    activeEmployees.map(renderEmployeeRow)
                                ) : (
                                     <TableRow><TableCell colSpan={6} className="h-24 text-center">Активные сотрудники не найдены.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                        </div>
                    </CardContent>
                </Card>

                {disabledEmployees.length > 0 && (
                    <Collapsible open={isBlockedListOpen} onOpenChange={setIsBlockedListOpen}>
                        <Card>
                            <CollapsibleTrigger asChild>
                                <CardHeader className="flex flex-row items-center justify-between cursor-pointer">
                                        <div>
                                            <CardTitle>Заблокированные сотрудники</CardTitle>
                                            <CardDescription>Список заблокированных пользователей.</CardDescription>
                                        </div>
                                        <Button variant="ghost" size="sm">
                                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isBlockedListOpen ? 'rotate-180' : ''}`} />
                                            <span className="sr-only">{isBlockedListOpen ? 'Скрыть' : 'Показать'}</span>
                                        </Button>
                                </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <CardContent>
                                    <div className="w-full overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Сотрудник</TableHead>
                                                    <TableHead>Должность</TableHead>
                                                    <TableHead className="text-center">Статус</TableHead>
                                                    <TableHead className="text-center">Удаленка</TableHead>
                                                    <TableHead>Комментарий к статусу</TableHead>
                                                    <TableHead className="text-right">Действия</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {disabledEmployees.map(renderEmployeeRow)}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>
                )}
            </div>
            {selectedEmployeeForAudit && <EmployeeAuditDialog isOpen={isAuditOpen} onClose={handleCloseAudit} employee={selectedEmployeeForAudit} allUsers={employees}/>}
            {selectedEmployeeForEdit && <EmployeeEditDialog isOpen={isEditOpen} onClose={handleCloseEdit} employee={selectedEmployeeForEdit} onSave={handleProfileUpdate}/>}
            {selectedEmployeeForStatus && <EmployeeStatusDialog isOpen={isStatusOpen} onClose={handleCloseStatus} employee={selectedEmployeeForStatus} onSave={handleStatusUpdate}/>}
            {isAddOpen && <AddEmployeeDialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onSave={handleAddEmployee}/>}
        </>
    );
}

function AddEmployeeDialog({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: (data: NewUserFormData) => void }) {
  const form = useForm<z.infer<typeof newEmployeeSchema>>({
    resolver: zodResolver(newEmployeeSchema),
    defaultValues: { firstName: "", lastName: "", position: "", email: "", password: "", role: "employee", telegram: "", isRemote: false },
  });
  const onSubmit = (values: z.infer<typeof newEmployeeSchema>) => { onSave(values); form.reset(); };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить нового сотрудника</DialogTitle>
          <DialogDescription>Создание новой учетной записи для сотрудника.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Имя</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Фамилия</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
            </div>
            <FormField control={form.control} name="position" render={({ field }) => (<FormItem><FormLabel>Должность</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Пароль</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Роль</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Выберите роль" /></SelectTrigger></FormControl><SelectContent><SelectItem value="employee">Сотрудник</SelectItem><SelectItem value="admin">Администратор</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="telegram" render={({ field }) => (<FormItem><FormLabel>Telegram (необязательно)</FormLabel><FormControl><Input {...field} placeholder="@username" /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="isRemote" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 mt-4"><FormLabel>Удаленная работа</FormLabel><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => { form.reset(); onClose(); }}>Отмена</Button>
              <Button type="submit">Создать</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EmployeeEditDialog({ isOpen, onClose, employee, onSave }: { isOpen: boolean, onClose: () => void, employee: User, onSave: (userId: string, data: UserUpdateData) => void }) {
  const [preview, setPreview] = useState<string | null>(employee.avatar);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const form = useForm<z.infer<typeof employeeProfileSchema>>({ resolver: zodResolver(employeeProfileSchema), defaultValues: { firstName: employee.firstName, lastName: employee.lastName, position: employee.position, email: employee.email, role: employee.role, telegram: employee.telegram || "", isRemote: employee.isRemote || false } });
  const onSubmit = (values: z.infer<typeof employeeProfileSchema>) => { onSave(employee.id, values); };
  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { form.setValue('avatarFile', file); setPreview(URL.createObjectURL(file)); } };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать профиль</DialogTitle>
          <DialogDescription>Изменение данных для {employee.firstName} {employee.lastName}.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={preview || undefined} className="object-cover" />
                <AvatarFallback>{employee.firstName[0]}{employee.lastName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                <Label>Новый аватар</Label>
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Выбрать файл</Button>
                <FormField control={form.control} name="avatarFile" render={() => (<FormItem><FormControl><Input ref={fileInputRef} type="file" accept="image/*" onChange={onAvatarChange} className="hidden"/></FormControl><FormMessage /></FormItem>)}/>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Имя</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Фамилия</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
            </div>
            <FormField control={form.control} name="position" render={({ field }) => (<FormItem><FormLabel>Должность</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Роль</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Выберите роль" /></SelectTrigger></FormControl><SelectContent><SelectItem value="employee">Сотрудник</SelectItem><SelectItem value="admin">Администратор</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="telegram" render={({ field }) => (<FormItem><FormLabel>Telegram</FormLabel><FormControl><Input {...field} placeholder="@username" /></FormControl><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="isRemote" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 mt-4"><FormLabel>Удаленная работа</FormLabel><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
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

function EmployeeStatusDialog({ isOpen, onClose, employee, onSave }: { isOpen: boolean, onClose: () => void, employee: User, onSave: (userId: string, status: Status, comment?: string) => void }) {
    const [status, setStatus] = useState(employee.status);
    const [comment, setComment] = useState(employee.statusComment || "");

    const statusOptions: { value: Status; label: string }[] = [
        { value: "online", label: "В сети" },
        { value: "offline", label: "Не в сети" },
        { value: "vacation", label: "В отпуске" },
        { value: "sick_leave", label: "На больничном" },
    ];

    const handleSave = () => {
        onSave(employee.id, status, comment);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Изменить статус для {employee.firstName} {employee.lastName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor={`status-select-${employee.id}`}>Статус</Label>
                        <Select value={status} onValueChange={(value: Status) => setStatus(value)}>
                            <SelectTrigger id={`status-select-${employee.id}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`comment-input-${employee.id}`}>Комментарий к статусу</Label>
                        <Textarea id={`comment-input-${employee.id}`} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Например: Ушел на обед, вернусь в 14:00" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Отмена</Button>
                    <Button onClick={handleSave}>Сохранить</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function EmployeeAuditDialog({ isOpen, onClose, employee, allUsers }: { isOpen: boolean, onClose: () => void, employee: User, allUsers: User[] }) {
    const { getLogsForUser } = useAuth();
    const [statusLogs, setStatusLogs] = useState<StatusLog[]>([]);
    const [balanceLogs, setBalanceLogs] = useState<BalanceLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            getLogsForUser(employee.id)
                .then(({ statusLogs, balanceLogs }) => { setStatusLogs(statusLogs); setBalanceLogs(balanceLogs); })
                .catch(error => { console.error("Failed to fetch logs for user:", error); })
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, employee.id, getLogsForUser]);

    const getAdminName = (adminId: string) => {
        if (adminId === employee.id) return `${employee.firstName} ${employee.lastName}`;
        const admin = allUsers.find(u => u.id === adminId);
        return admin ? `${admin.firstName} ${admin.lastName}` : 'Система';
    }
    
    const formatTimestamp = (timestamp: Date) => timestamp.toLocaleString('ru-RU');

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Аудит: {employee.firstName} {employee.lastName}</DialogTitle>
                    <DialogDescription>{employee.position}</DialogDescription>
                </DialogHeader>
                {isLoading ? (
                    <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><p className="ml-4">Загрузка логов...</p></div>
                ) : (
                    <Tabs defaultValue="status">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="status">Аудит статусов</TabsTrigger>
                            <TabsTrigger value="balance">Аудит баллов</TabsTrigger>
                        </TabsList>
                        <TabsContent value="status" className="mt-4">
                            <AuditTableLogs<StatusLog> 
                                logs={statusLogs}
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
                                logs={balanceLogs}
                                headers={["Действие", "Баллы", "Комментарий", "Кем выполнено", "Дата и время"]}
                                renderRow={(log) => (
                                    <>
                                        <TableCell>{log.action === 'add' ? 'Начисление' : 'Списание'}</TableCell>
                                        <TableCell className={`font-mono ${log.action === 'add' ? 'text-green-500' : 'text-red-500'}`}>{log.action === 'add' ? '+' : '-'}{log.points.toLocaleString('ru-RU')}</TableCell>
                                        <TableCell className="text-muted-foreground">{log.comment || '–'}</TableCell>
                                        <TableCell>{getAdminName(log.adminId)}</TableCell>
                                        <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                                    </>
                                )}
                            />
                        </TabsContent>
                    </Tabs>
                )}
                 <DialogClose asChild><Button type="button" variant="outline" className="mt-4">Закрыть</Button></DialogClose>
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
