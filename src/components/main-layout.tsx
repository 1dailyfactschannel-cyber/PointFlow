
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  BarChart2,
  Store,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  Wallet,
  User as UserIcon,
  PanelLeft,
  ShoppingBag,
  Trophy,
  Bell,
  Check,
} from "lucide-react";
import type { ReactNode } from "react";
import React, { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { StatusSelect } from "./status-select";
import { auth } from "@/lib/firebase";


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
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const { notifications, unreadCount, markAsRead, lastNotification } = useNotificationStore();

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
            icon: '/logo.svg' // Assuming a logo exists in public folder
        });
    }
  }, [lastNotification]);

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  }

  const navItems = user?.role === "admin" ? adminNavItems : employeeNavItems;

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
              <Button variant="outline" size="icon" className="md:hidden mr-4">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Открыть меню</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full max-w-xs">
                <Link href="/dashboard" className="mb-6 flex items-center gap-2">
                    <Logo className="h-6 w-6 text-primary" />
                    <span className="font-bold text-lg">StatusCraft</span>
                </Link>
                <div className="flex flex-col gap-4">
                    {navItems.map((item) => (
                      <NavLink key={item.href} href={item.href} className="text-lg flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          {item.label}
                      </NavLink>
                    ))}
                </div>
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
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-9 w-9" status={user.status}>
                    <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                    <AvatarFallback>
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-3">
                     <Avatar className="h-10 w-10" status={user.status}>
                        <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                        <AvatarFallback>{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{`${user.firstName} ${user.lastName}`}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                 <DropdownMenuSeparator />
                 <div className="p-2">
                    <StatusSelect />
                 </div>
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


function NotificationBell({
    notifications,
    unreadCount,
    onOpen
}: {
    notifications: StoredNotification[],
    unreadCount: number,
    onOpen: () => void,
}) {
    const [isOpen, setIsOpen] = useState(false);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open) {
            onOpen();
        }
    };
    
    return (
        <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 md:w-96">
                <DropdownMenuLabel>Уведомления</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.map(notif => (
                            <DropdownMenuItem key={notif.id} className={cn("flex-col items-start gap-1 whitespace-normal", !notif.read && "bg-primary/5")}>
                                <p className="font-semibold">{notif.title}</p>
                                <p className="text-sm text-muted-foreground">{notif.body}</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                    {formatDistanceToNow(notif.timestamp, { addSuffix: true, locale: ru })}
                                </p>
                            </DropdownMenuItem>
                        ))}
                    </div>
                ) : (
                    <p className="p-4 text-center text-sm text-muted-foreground">Новых уведомлений нет</p>
                )}
                {notifications.length > 0 && (
                     <DropdownMenuSeparator />
                )}
                <DropdownMenuItem className="justify-center">
                    <Check className="mr-2 h-4 w-4" />
                    <span>Отметить все как прочитанные</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
