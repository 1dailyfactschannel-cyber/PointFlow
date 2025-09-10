
"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { redirect } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Check, X, Clock, Award, Loader2 } from "lucide-react";
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, query, where, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/auth-provider";
import { 
    type Product,
    type PurchaseRequestStatus,
    type User,
    type PurchaseRequest,
} from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";


const productSchema = z.object({
  name: z.string().min(1, "Название обязательно."),
  description: z.string().min(1, "Описание обязательно."),
  price: z.coerce.number().int().positive("Цена должна быть положительной."),
  image: z.string().url("Неверный URL изображения."),
});

const balanceChangeSchema = z.object({
  points: z.coerce.number().int().positive("Количество баллов должно быть положительным числом."),
  action: z.enum(["add", "subtract"]),
  comment: z.string().optional(),
});

type BalanceChangeFormValues = z.infer<typeof balanceChangeSchema>;

const statusMap: Record<PurchaseRequestStatus, { text: string; className: string; icon: React.ReactNode }> = {
  pending: { text: 'В ожидании', className: 'bg-yellow-500', icon: <Clock className="mr-2 h-4 w-4" /> },
  approved: { text: 'Одобрено', className: 'bg-green-500', icon: <Check className="mr-2 h-4 w-4" /> },
  rejected: { text: 'Отклонено', className: 'bg-red-500', icon: <X className="mr-2 h-4 w-4" /> },
};


export default function AdminUnifiedManagementPage() {
    const { user: adminUser } = useAuth();
    const [activeTab, setActiveTab] = useState("products");
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

    if (!adminUser || adminUser.role !== 'admin') {
        redirect('/dashboard');
    }

    useEffect(() => {
        const q = query(collection(db, "purchaseRequests"), where("status", "==", "pending"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPendingRequestsCount(snapshot.size);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <Tabs defaultValue="products" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                    <TabsTrigger value="products">Товары</TabsTrigger>
                    <TabsTrigger value="requests">
                        Заявки
                        {pendingRequestsCount > 0 && (
                            <Badge className="ml-2 bg-primary text-primary-foreground">
                                {pendingRequestsCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="balance">Начисление баллов</TabsTrigger>
                </TabsList>
                <TabsContent value="products">
                    <ProductsTab />
                </TabsContent>
                <TabsContent value="requests">
                    <RequestsTab />
                </TabsContent>
                 <TabsContent value="balance">
                    <BalanceTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}


function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, "products"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setIsLoading(false);
    }, () => setIsLoading(false));
    return () => unsubscribe();
  }, []);

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
  });

  const openDialog = (product: Product | null = null) => {
    setEditingProduct(product);
    form.reset(product ? product : { name: "", description: "", price: 0, image: "https://picsum.photos/400/300" });
    setIsDialogOpen(true);
  }

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "products", id));
    toast({ title: "Товар удален", variant: "destructive" });
  }

  const onSubmit = async (values: z.infer<typeof productSchema>) => {
    if (editingProduct) {
        await updateDoc(doc(db, "products", editingProduct.id), values);
        toast({ title: "Товар обновлен" });
    } else {
        await addDoc(collection(db, "products"), values);
        toast({ title: "Товар добавлен" });
    }
    setIsDialogOpen(false);
  }

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle>Управление товарами</CardTitle>
          <CardDescription>Добавление, изменение и удаление товаров.</CardDescription>
        </div>
        <Button onClick={() => openDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Добавить товар
        </Button>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Фото</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead className="text-right">Цена</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></TableCell></TableRow>
            ) : products.length > 0 ? (
                 products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Image
                        src={product.image}
                        alt={product.name}
                        width={64}
                        height={64}
                        className="rounded-md object-cover"
                      />
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-sm truncate">{product.description}</TableCell>
                    <TableCell className="text-right font-mono whitespace-nowrap">{product.price.toLocaleString('ru-RU')}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => openDialog(product)}>
                            <Edit className="mr-2 h-4 w-4" /> Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(product.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
            ) : (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">Товары еще не добавлены.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingProduct ? "Редактировать товар" : "Добавить новый товар"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Название</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Описание</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="price" render={({ field }) => (
                            <FormItem><FormLabel>Цена</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="image" render={({ field }) => (
                            <FormItem><FormLabel>URL изображения</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Отмена</Button>
                            <Button type="submit">Сохранить</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    </Card>
  );
}

function RequestsTab() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  // REFACTORED: Remove `users` from useAuth
  const { updateUserBalance } = useAuth(); 
  // REFACTORED: Add local state for users and products
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // REFACTORED: Consolidate loading logic
    let activeSubscriptions = 3;
    const onDataLoaded = () => {
        activeSubscriptions -= 1;
        if (activeSubscriptions === 0) {
            setIsLoading(false);
        }
    };

    const qRequests = query(collection(db, "purchaseRequests"));
    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({
        id: doc.id, ...doc.data(), timestamp: doc.data().timestamp.toDate(),
      } as PurchaseRequest)));
      onDataLoaded();
    }, onDataLoaded);

    const qProducts = query(collection(db, "products"));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      onDataLoaded();
    }, onDataLoaded);

    // REFACTORED: Fetch users directly
    const qUsers = query(collection(db, "users"));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
        onDataLoaded();
    }, onDataLoaded);

    return () => {
      unsubRequests();
      unsubProducts();
      unsubUsers();
    };
  }, []);

  const handleRequestUpdate = async (requestId: string, newStatus: 'approved' | 'rejected') => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;

    const user = users.find(u => u.id === request.userId);
    const product = products.find(p => p.id === request.productId);

    if (!product) {
         toast({ variant: "destructive", title: "Товар не найден" });
         return;
    }
    
    if (newStatus === 'approved' && user) {
      if (user.balance < product.price) {
        toast({
          variant: "destructive",
          title: "Недостаточно баллов",
          description: `У ${user.firstName} ${user.lastName} недостаточно баллов для покупки.`,
        });
        // Reject the request if balance is insufficient
        await updateDoc(doc(db, "purchaseRequests", requestId), { status: 'rejected' });
        return;
      }
      // If balance is sufficient, subtract points
      await updateUserBalance(user.id, product.price, 'subtract', `Покупка: ${product.name}`);
    }
    
    // Update the request status
    await updateDoc(doc(db, "purchaseRequests", requestId), { status: newStatus });
    
    toast({
      title: `Заявка ${newStatus === 'approved' ? 'одобрена' : 'отклонена'}`,
    });
  };

  const enrichedRequests = useMemo(() => {
    return requests
      .map(request => {
        const user = users.find(u => u.id === request.userId);
        const product = products.find(p => p.id === request.productId);
        return { ...request, user, product };
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [requests, users, products]);

  return (
    <Card className="mt-4">
        <CardHeader>
          <CardTitle>Заявки на покупку</CardTitle>
          <CardDescription>Одобрение или отклонение заявок от сотрудников.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сотрудник</TableHead>
                <TableHead>Товар</TableHead>
                <TableHead className="text-right">Цена</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></TableCell></TableRow>
            ) : enrichedRequests.length > 0 ? (
              enrichedRequests.map(({ id, user, product, timestamp, status }) => (
                <TableRow key={id} className={cn(status === 'pending' && 'bg-blue-500/10')}>
                  <TableCell>
                    {user ? (
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="whitespace-nowrap">{user.firstName} {user.lastName}</span>
                      </div>
                    ) : 'Неизвестно'}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{product?.name || 'Неизвестно'}</TableCell>
                  <TableCell className="text-right font-mono whitespace-nowrap">{product?.price.toLocaleString('ru-RU') || '–'}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{timestamp.toLocaleDateString('ru-RU')}</TableCell>
                  <TableCell>
                    <Badge className={cn('text-white whitespace-nowrap', statusMap[status].className)}>
                      {statusMap[status].icon}
                      {statusMap[status].text}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" onClick={() => handleRequestUpdate(id, 'approved')}>
                          <Check className="h-5 w-5" />
                          <span className="sr-only">Одобрить</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleRequestUpdate(id, 'rejected')}>
                          <X className="h-5 w-5" />
                           <span className="sr-only">Отклонить</span>
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">Заявок на покупку пока нет.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
  );
}

function BalanceTab() {
  // REFACTORED: Remove `users` from useAuth, keep `currentUser` and `updateUserBalance`
  const { user: currentUser, updateUserBalance } = useAuth();
  const { toast } = useToast();
  
  // REFACTORED: Add local state for users
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);

  useEffect(() => {
      // REFACTORED: Fetch users directly from Firestore
      const q = query(collection(db, "users"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
          setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
          setIsLoading(false);
      }, () => setIsLoading(false));
      return () => unsubscribe();
  }, []);

  const handleBalanceChange = (user: User) => {
    setSelectedUser(user);
    setIsBalanceDialogOpen(true);
  };

  const onBalanceChangeSubmit = (values: BalanceChangeFormValues) => {
    if (selectedUser) {
        updateUserBalance(selectedUser.id, values.points, values.action, values.comment);
        
        const actionText = values.action === 'add' ? 'начислено' : 'списано';
        
        toast({
            title: "Баланс обновлен",
            description: `${values.points} баллов было ${actionText} для ${selectedUser.firstName} ${selectedUser.lastName}.`,
        });
    }
    setIsBalanceDialogOpen(false);
  };
  
  return (
    <>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Управление баллами</CardTitle>
          <CardDescription>Начисление или списание баллов сотрудникам.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сотрудник</TableHead>
                <TableHead>Должность</TableHead>
                <TableHead className="text-right">Баланс</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {isLoading ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></TableCell></TableRow>
            ) : users.length > 0 ? (
              // REFACTORED: Map over local `users` state
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="whitespace-nowrap">{user.firstName} {user.lastName} {user.id === currentUser?.id && '(Вы)'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{user.position}</TableCell>
                  <TableCell className="text-right font-mono whitespace-nowrap">{user.balance.toLocaleString('ru-RU')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleBalanceChange(user)}>
                        <Award className="mr-2 h-4 w-4" />
                        <span className="whitespace-nowrap">Изменить баланс</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow><TableCell colSpan={4} className="h-24 text-center">Сотрудники не найдены.</TableCell></TableRow>
            )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
      {selectedUser && (
        <BalanceChangeDialog
          isOpen={isBalanceDialogOpen}
          onOpenChange={setIsBalanceDialogOpen}
          user={selectedUser}
          onSubmit={onBalanceChangeSubmit}
        />
      )}
    </>
  );
}

function BalanceChangeDialog({ isOpen, onOpenChange, user, onSubmit }: { isOpen: boolean, onOpenChange: (open: boolean) => void, user: User, onSubmit: (values: BalanceChangeFormValues) => void }) {
    const form = useForm<BalanceChangeFormValues>({
        resolver: zodResolver(balanceChangeSchema),
        defaultValues: { points: 100, action: 'add', comment: '' },
    });

    const handleSubmit = (values: BalanceChangeFormValues) => {
        onSubmit(values);
        form.reset();
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Изменить баланс для {user.firstName} {user.lastName}</DialogTitle>
                    <DialogDescription>
                        Текущий баланс: {user.balance.toLocaleString('ru-RU')} баллов.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                         <FormField
                            control={form.control}
                            name="action"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Действие</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex space-x-4"
                                    >
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value="add" />
                                            </FormControl>
                                            <FormLabel className="font-normal">Начислить</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value="subtract" />
                                            </FormControl>
                                            <FormLabel className="font-normal">Списать</FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField control={form.control} name="points" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Количество баллов</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="comment" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Комментарий (необязательно)</FormLabel>
                                <FormControl>
                                    <Textarea {...field} placeholder="Например: за отличную работу в квартале" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Отмена</Button>
                            <Button type="submit">Применить</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
