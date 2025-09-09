
"use client";

import { useMemo, useState, useEffect } from 'react';
import Image from "next/image";
import { useAuth } from '@/context/auth-provider';
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { type User, type Product, type PurchaseRequest } from '@/lib/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, Wallet, ShoppingBag } from 'lucide-react';
import { formatDistanceStrict } from 'date-fns';
import { ru } from 'date-fns/locale';

type EnrichedPurchaseRequest = PurchaseRequest & { user?: User, product?: Product };

export default function CommunityPage() {
    const { users } = useAuth();
    const [requests, setRequests] = useState<PurchaseRequest[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        const requestsQuery = query(collection(db, 'purchaseRequests'), where('status', '==', 'approved'));
        const unsubRequests = onSnapshot(requestsQuery, (snapshot) => {
            const fetchedRequests = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    timestamp: (data.timestamp as Timestamp)?.toDate(),
                } as PurchaseRequest;
            }).filter(r => r.timestamp);
             setRequests(fetchedRequests.sort((a,b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime()));
        });

        const productsQuery = query(collection(db, 'products'));
        const unsubProducts = onSnapshot(productsQuery, (snapshot) => {
            const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(fetchedProducts);
        });

        return () => {
            unsubRequests();
            unsubProducts();
        };
    }, []);

    const leaderboard = useMemo(() => {
        return [...users].sort((a, b) => b.balance - a.balance);
    }, [users]);

    const purchaseHistory: EnrichedPurchaseRequest[] = useMemo(() => {
        return requests.map(request => ({
            ...request,
            user: users.find(u => u.id === request.userId),
            product: products.find(p => p.id === request.productId),
        }));
    }, [requests, users, products]);

    const getLeaderboardBadge = (index: number) => {
        if (index === 0) return <Crown className="h-5 w-5 text-yellow-400" />;
        if (index === 1) return <Crown className="h-5 w-5 text-gray-400" />;
        if (index === 2) return <Crown className="h-5 w-5 text-yellow-600" />;
        return <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>;
    }

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <Tabs defaultValue="leaderboard">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="leaderboard">
                        <Crown className="mr-2 h-4 w-4" />
                        Таблица лидеров
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        История покупок
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="leaderboard" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Таблица лидеров</CardTitle>
                            <CardDescription>Рейтинг сотрудников по количеству накопленных баллов.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <div className="w-full overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16 text-center">Место</TableHead>
                                        <TableHead>Сотрудник</TableHead>
                                        <TableHead>Должность</TableHead>
                                        <TableHead className="text-right">Баллы</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {leaderboard.map((user, index) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="text-center">
                                                <div className="flex justify-center items-center h-full">
                                                    {getLeaderboardBadge(index)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar status={user.status}>
                                                        <AvatarImage src={user.avatar} />
                                                        <AvatarFallback>{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="whitespace-nowrap">{user.firstName} {user.lastName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground whitespace-nowrap">{user.position}</TableCell>
                                            <TableCell className="text-right font-mono font-semibold">
                                                <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                                                    <Wallet className="h-4 w-4 text-amber-500" />
                                                    {user.balance.toLocaleString('ru-RU')}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="history" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>История покупок</CardTitle>
                            <CardDescription>Все одобренные покупки в корпоративном магазине.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-[600px] overflow-y-auto space-y-6">
                                {purchaseHistory.length > 0 ? purchaseHistory.map(({ id, user, product, timestamp }) => (
                                    <div key={id} className="flex items-center gap-4">
                                         {product && <Image src={product.image} alt={product.name} width={64} height={64} className="rounded-md object-cover flex-shrink-0" data-ai-hint="product image" />}
                                        <div className="flex-grow">
                                            <p className="font-medium">
                                                {user ? `${user.firstName} ${user.lastName}` : 'Кто-то'} приобрел товар «{product?.name || 'Неизвестный товар'}»
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDistanceStrict(timestamp, new Date(), { addSuffix: true, locale: ru })}
                                            </p>
                                        </div>
                                         <div className="flex items-center gap-2 font-semibold text-md">
                                            <Wallet className="h-5 w-5 text-amber-500" />
                                            <span>{product?.price.toLocaleString('ru-RU')}</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center text-muted-foreground py-12">
                                        <p>Пока не было совершено ни одной покупки.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
