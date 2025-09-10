
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart2, Store, Users, LogOut, Wallet, User as UserIcon, PanelLeft, 
  ShoppingBag, Trophy, Bell, Check, Circle, HelpCircle, XCircle, 
  Coffee, Plane, Edit, Computer
} from "lucide-react";
import type { ReactNode } from "react";
import React, { useEffect, useState } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, 
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, 
  DialogFooter, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-provider";
import { Logo } from "./icons";
import { Skeleton } from "./ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "./theme-toggle";
import { useNotificationStore, type StoredNotification } from "@/lib/notification-store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import type { Status } from "@/lib/data";

const employeeNavItems = [
  { href: "/dashboard/store", icon: Store, label: "Магазин" },
  { href: "/dashboard/community", icon: Trophy, label: "Сообщество" },
  { href: "/dashboard/analytics", icon: BarChart2, label: "Аналитика" },
];

const adminNavItems = [
  { href: "/dashboard/admin/employees", icon: Users, label: "Сотрудники" },
  { href: "/dashboard/admin/store", icon: Store, label: "Управление" },
  { href: "/dashboard/admin/analytics", icon: BarChart2, label: "Аналитика" },
  { href: "/dashboard/admin/notifications", icon: Bell, label: "Уведомления" },
  { href: "/dashboard/store", icon: ShoppingBag, label: "Магазин" },
];

const statusConfig: Record<Status, { label: string; icon: React.ElementType; colorClassName: string; }> = {
    online: { label: "В сети", icon: Circle, colorClassName: "text-green-500" },
    offline: { label: "Не в сети", icon: XCircle, colorClassName: "text-slate-500" },
    vacation: { label: "В отпуске", icon: Plane, colorClassName: "text-blue-500" },
    sick_leave: { label: "На больничном", icon: Coffee, colorClassName: "text-orange-500" },
};

function NavLink({ href, children, className }: { href: string, children: ReactNode, className?: string }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "font-medium transition-colors hover:text-primary",
        isActive ? 'text-primary' : 'text-muted-foreground',
        className
      )}
    >
      {children}
    </Link>
  );
}

export default function MainLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut, updateStatus, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const { notifications, unreadCount, markAsRead, lastNotification } = useNotificationStore();

  const [isStatusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Status>('online');
  const [statusComment, setStatusComment] = useState("");

  useEffect(() => {
    if (user) {
      setSelectedStatus(user.status);
      setStatusComment(user.statusComment || '');
    }
  }, [user]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                toast({ title: 'Уведомления включены', description: 'Вы будете получать оповещения.' });
            }
        });
    }
  }, [toast]);
  
  useEffect(() => {
    if (lastNotification && "Notification" in window && Notification.permission === "granted") {
        new Notification(lastNotification.title, {
            body: lastNotification.body,
            icon: '/logo.svg'
        });
    }
  }, [lastNotification]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  }

  const handleStatusUpdate = async () => {
    if (!user) return;
    try {
      await updateStatus(selectedStatus, statusComment);
      toast({ title: "Статус обновлен", description: "Ваш новый статус и комментарий сохранены." });
      setStatusDialogOpen(false);
    } catch (error) {
      console.error("Failed to update status:", error);
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось обновить статус." });
    }
  };
  
  const handleRemoteChange = async (isRemote: boolean) => {
    if (!user) return;
    try {
      await updateUserProfile(user.id, { isRemote });
      toast({ title: "Режим работы обновлен", description: `Удаленка: ${isRemote ? 'включена' : 'выключена'}` });
    } catch (error) {
      console.error("Failed to update remote status:", error);
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось обновить режим работы." });
    }
  };

  const navItems = user?.role === "admin" ? adminNavItems : employeeNavItems;

  const currentStatusConfig = user ? statusConfig[user.status] : null;
  const CurrentStatusIcon = currentStatusConfig?.icon || HelpCircle;
  const currentStatusLabel = currentStatusConfig?.label || "Неизвестно";
  const currentStatusColor = currentStatusConfig?.colorClassName || "text-muted-foreground";

  const headerContent = loading ? (
    <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
      <Skeleton className="h-8 w-24" />
      <div className="ml-auto flex items-center gap-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>
  ) : user ? (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
          
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="md:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <nav className="grid gap-6 text-lg font-medium">
                <Link
                  href="/dashboard"
                  className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                >
                  <Logo className="h-5 w-5 transition-all group-hover:scale-110" />
                  <span className="sr-only">StatusCraft</span>
                </Link>
                {navItems.map((item) => (
                  <NavLink key={item.href} href={item.href} className="flex items-center gap-4 px-2.5">
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          
          <Link href="/dashboard" className="mr-6 flex items-center gap-2">
            <Logo className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block">StatusCraft</span>
          </Link>
          
          <nav className="hidden items-center gap-6 text-sm md:flex">
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href}>{item.label}</NavLink>
            ))}
          </nav>
          
           <div className="flex flex-1 items-center justify-end gap-2 md:gap-4">
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-2 sm:px-3 py-1.5">
                  <Wallet className="h-5 w-5 text-amber-500" />
                  <span className="font-semibold text-sm sm:text-base">{user.balance.toLocaleString('ru-RU')}</span>
              </div>

            <NotificationBell notifications={notifications} unreadCount={unreadCount} onOpen={markAsRead} />
            <ThemeToggle />
            
            <Dialog open={isStatusDialogOpen} onOpenChange={setStatusDialogOpen}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full" aria-label="Открыть меню пользователя">
                    <Avatar className="h-9 w-9" status={user.status}>
                      <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} className="object-cover" />
                      <AvatarFallback>{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10" status={user.status}>
                          <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} className="object-cover" />
                          <AvatarFallback>{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{`${user.firstName} ${user.lastName}`}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                   <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <div className="flex items-center">
                         <CurrentStatusIcon className={cn("mr-2 h-4 w-4", currentStatusColor)} />
                         <div className="flex flex-col">
                            <span className={cn("font-semibold", currentStatusColor)}>{currentStatusLabel}</span>
                            {user.statusComment && <span className="text-xs text-muted-foreground truncate max-w-40">{user.statusComment}</span>}
                         </div>
                      </div>
                  </DropdownMenuItem>
                  <DialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Изменить статус</span>
                    </DropdownMenuItem>
                  </DialogTrigger>
                   <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Label htmlFor="remote-checkbox" className="flex items-center gap-2 font-normal cursor-pointer">
                            <Computer className="mr-2 h-4 w-4" />
                            <span>Удаленка</span>
                            <div className="flex-grow" />
                            <Checkbox 
                                id="remote-checkbox"
                                checked={user.isRemote}
                                onCheckedChange={handleRemoteChange}
                                className="mr-2 h-4 w-4"
                            />
                        </Label>
                   </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={'/dashboard'}><UserIcon className="mr-2 h-4 w-4" />Профиль</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />Выйти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Обновить статус</DialogTitle>
                  <DialogDescription>Выберите новый статус и добавьте комментарий, если нужно.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="status-select">Статус</Label>
                        <Select value={selectedStatus} onValueChange={(value: Status) => setSelectedStatus(value)}>
                            <SelectTrigger id="status-select">
                                <SelectValue placeholder="Выберите статус..." />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.keys(statusConfig) as Array<Status>).map((status) => {
                                    const { label, icon: Icon, colorClassName } = statusConfig[status];
                                    return (
                                        <SelectItem key={status} value={status}>
                                            <div className="flex items-center gap-2">
                                                <Icon className={cn("h-4 w-4", colorClassName)} />
                                                <span>{label}</span>
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="status-comment">Комментарий</Label>
                        <Textarea id="status-comment" placeholder="Например, буду в 14:00" value={statusComment} onChange={(e) => setStatusComment(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => setStatusDialogOpen(false)}>Отмена</Button>
                  <Button type="button" onClick={handleStatusUpdate}>Сохранить</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>
        </div>
    </header>
  ) : null;


  return (
    <div className="flex min-h-screen w-full flex-col">
        {headerContent}
        <main className="flex-1">{children}</main>
    </div>
  );
}

function NotificationBell({ /* props */ }) { 
    // ... implementation 
    return null;
}
