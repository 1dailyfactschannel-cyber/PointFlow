
"use client";

import { useMemo, useEffect, useState, useRef, ChangeEvent } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Camera, Save, Mail, Send, KeyRound, Clock, Check, X, ShoppingBag } from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Product, type PurchaseRequest, type PurchaseRequestStatus } from "@/lib/data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";

const profileSchema = z.object({
  firstName: z.string().min(1, "Имя обязательно."),
  lastName: z.string().min(1, "Фамилия обязательна."),
  position: z.string().min(1, "Должность обязательна."),
  telegram: z.string().optional(),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Текущий пароль обязателен."),
    newPassword: z.string().min(6, "Новый пароль должен быть не менее 6 символов."),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Пароли не совпадают.",
    path: ["confirmPassword"],
});


const statusMap: Record<PurchaseRequestStatus, { text: string; className: string; icon: React.ReactNode }> = {
  pending: { text: 'В ожидании', className: 'bg-yellow-500', icon: <Clock className="mr-2 h-4 w-4" /> },
  approved: { text: 'Одобрено', className: 'bg-green-500', icon: <Check className="mr-2 h-4 w-4" /> },
  rejected: { text: 'Отклонено', className: 'bg-red-500', icon: <X className="mr-2 h-4 w-4" /> },
};


export default function ProfilePage() {
  const { user, loading, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      position: user?.position || "",
      telegram: user?.telegram || "",
    },
  });
  
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    }
  });

  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        position: user.position,
        telegram: user.telegram || "",
      });
    }
  }, [user, form]);

  const handleProfileSubmit = (values: z.infer<typeof profileSchema>) => {
      if (!user) return;
      updateUserProfile(user.id, values);
      toast({ title: "Профиль обновлен", description: "Ваши данные успешно сохранены." });
  };
  
  const handlePasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
    if (!auth.currentUser || !auth.currentUser.email) return;

    const credential = EmailAuthProvider.credential(auth.currentUser.email, values.currentPassword);

    try {
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, values.newPassword);
        toast({ title: "Пароль изменен", description: "Ваш пароль был успешно обновлен." });
        passwordForm.reset();
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Ошибка",
            description: "Не удалось изменить пароль. Пожалуйста, проверьте свой текущий пароль.",
        });
    }
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && user) {
        try {
            await updateUserProfile(user.id, { avatarFile: file });
            toast({ title: "Аватар обновлен", description: "Ваш аватар был успешно изменен." });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Ошибка",
                description: "Не удалось загрузить аватар.",
            });
        }
    }
  };

  if (loading || !user) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
       <Card>
        <CardHeader className="items-center text-center">
             <div className="relative mb-4">
                <Avatar className="h-24 w-24" status={user.status}>
                   <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                   <AvatarFallback>{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
                </Avatar>
                <input type="file" ref={avatarFileRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                <Button size="icon" variant="outline" className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-background" onClick={() => avatarFileRef.current?.click()}>
                  <Camera className="h-4 w-4" />
                  <span className="sr-only">Сменить аватар</span>
                </Button>
              </div>
              <CardTitle className="text-2xl">{`${user.firstName} ${user.lastName}`}</CardTitle>
              <CardDescription>{user.position}</CardDescription>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-6 pt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{user.email}</span>
                  </div>
                   <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      <span>{user.telegram || 'Не указан'}</span>
                  </div>
               </div>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="general">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3">
                    <TabsTrigger value="general">Общая информация</TabsTrigger>
                    <TabsTrigger value="security">Безопасность</TabsTrigger>
                    <TabsTrigger value="requests">Мои заявки</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="pt-6">
                    <Form {...form}>
                        <form
                        onSubmit={form.handleSubmit(handleProfileSubmit)}
                        className="space-y-6"
                        >
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
                        <FormField control={form.control} name="telegram" render={({ field }) => (
                                <FormItem><FormLabel>Telegram</FormLabel><FormControl><Input {...field} placeholder="@username" /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <div className="flex justify-end">
                            <Button type="submit">
                            <Save className="mr-2 h-4 w-4" />
                            Сохранить изменения
                            </Button>
                        </div>
                        </form>
                    </Form>
                </TabsContent>
                 <TabsContent value="security" className="pt-6">
                    <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-6 max-w-md mx-auto">
                            <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                                <FormItem><FormLabel>Текущий пароль</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                                <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                                <FormItem><FormLabel>Новый пароль</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                                <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                                <FormItem><FormLabel>Подтвердите новый пароль</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <div className="flex justify-end">
                                <Button type="submit">
                                    <KeyRound className="mr-2 h-4 w-4" />
                                    Сменить пароль
                                </Button>
                            </div>
                        </form>
                    </Form>
                 </TabsContent>
                 <TabsContent value="requests" className="pt-6">
                    <UserRequestsTab />
                 </TabsContent>
            </Tabs>
        </CardContent>
       </Card>
    </div>
  );
}

function UserRequestsTab() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!user) return;
    const requestsQuery = query(collection(db, "purchaseRequests"), where("userId", "==", user.id));
    const unsubRequests = onSnapshot(requestsQuery, (snapshot) => {
        const reqs = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            timestamp: (doc.data().timestamp as Timestamp)?.toDate()
        } as PurchaseRequest)).filter(r => r.timestamp);
      setRequests(reqs.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()));
    });
    
    const productsQuery = query(collection(db, "products"));
    const unsubProducts = onSnapshot(productsQuery, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    return () => {
        unsubRequests();
        unsubProducts();
    };
  }, [user]);

  const userRequests = useMemo(() => {
    return requests.map((r) => ({
        ...r,
        product: products.find((p) => p.id === r.productId),
      }));
  }, [requests, products]);

  return (
    <div className="max-h-[400px] overflow-y-auto">
      <div className="w-full overflow-x-auto">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Товар</TableHead>
                <TableHead className="text-right">Цена</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Статус</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {userRequests.length > 0 ? (
                userRequests.map((request) => (
                <TableRow key={request.id}>
                    <TableCell>
                    <div className="flex items-center gap-3">
                        {request.product && (
                        <Image
                            src={request.product.image}
                            alt={request.product.name}
                            width={40}
                            height={40}
                            className="rounded-md object-cover"
                            data-ai-hint="product image"
                        />
                        )}
                        <span className="font-medium whitespace-nowrap">{request.product?.name || "Неизвестный товар"}</span>
                    </div>
                    </TableCell>
                    <TableCell className="text-right font-mono whitespace-nowrap">{request.product?.price.toLocaleString("ru-RU")}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{request.timestamp.toLocaleDateString("ru-RU")}</TableCell>
                    <TableCell>
                    <Badge className={cn("text-white whitespace-nowrap", statusMap[request.status].className)}>
                        {statusMap[request.status].icon}
                        {statusMap[request.status].text}
                    </Badge>
                    </TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <ShoppingBag className="h-8 w-8" />
                        <p>У вас еще нет заявок на покупку.</p>
                    </div>
                </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
       </div>
    </div>
  );
}


function ProfileSkeleton() {
  return (
     <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
        <Card>
            <CardHeader className="items-center text-center">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="mt-4 h-7 w-48" />
                <Skeleton className="h-5 w-32" />
                 <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-6 pt-2 w-full">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-32" />
                 </div>
            </CardHeader>
             <CardContent>
                <div className="w-full">
                    <Skeleton className="h-10 w-full mx-auto" />
                </div>
                <div className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
                    </div>
                    <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
                    <div className="flex justify-end">
                        <Skeleton className="h-10 w-40" />
                    </div>
                </div>
            </CardContent>
        </Card>
     </div>
  );
}
