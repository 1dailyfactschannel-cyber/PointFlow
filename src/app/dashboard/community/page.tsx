"use client";

import { useMemo } from 'react';
import { useAuth } from '@/context/auth-provider';
import { type User } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, Wallet } from 'lucide-react';

export default function CommunityPage() {
    const { users } = useAuth();

    const leaderboard = useMemo(() => {
        // Ensure users is an array before sorting
        return [...(users || [])].sort((a, b) => b.balance - a.balance);
    }, [users]);

    const getLeaderboardBadge = (index: number) => {
        if (index === 0) return <Crown className="h-5 w-5 text-yellow-400" />;
        if (index === 1) return <Crown className="h-5 w-5 text-gray-400" />;
        if (index === 2) return <Crown className="h-5 w-5 text-yellow-600" />;
        return <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>;
    }

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
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
        </div>
    );
}