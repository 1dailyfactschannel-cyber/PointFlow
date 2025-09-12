
"use client";

import { useAuth } from "@/context/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, ArrowDown, ArrowUp } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function CommunityPage() {
  const { users, loading, purchaseHistory } = useAuth();

  const sortedUsers = [...users].sort((a, b) => b.balance - a.balance);

  if (loading) {
    return <CommunityPageSkeleton />;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Leaderboard Column */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Рейтинг лидеров</CardTitle>
              <CardDescription>Сотрудники с самым высоким балансом.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedUsers.map((user, index) => (
                  <div key={user.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="font-bold text-lg w-8 text-center">{index + 1}</div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} className="object-cover"/>
                      <AvatarFallback>{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-semibold">{`${user.firstName} ${user.lastName}`}</div>
                      <div className="text-sm text-muted-foreground">{user.position}</div>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-amber-500">
                      {index === 0 && <Crown className="h-5 w-5 text-yellow-500" />}
                      {user.balance.toLocaleString('ru-RU')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Purchase History Column */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>История покупок</CardTitle>
              <CardDescription>Последние приобретения в магазине.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {purchaseHistory.map(purchase => (
                        <div key={purchase.id} className="flex items-start gap-4">
                            <Avatar className="h-10 w-10 border">
                                <AvatarImage src={purchase.user?.avatar} alt={purchase.user?.firstName} className="object-cover"/>
                                <AvatarFallback>{purchase.user?.firstName[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-sm">
                                <p>
                                    <span className="font-semibold">{`${purchase.user?.firstName} ${purchase.user?.lastName}`}</span>
                                    <span> купил(а) </span>
                                    <span className="font-semibold">{purchase.item}</span>
                                    <span> за </span>
                                    <span className="font-bold text-red-500">-{purchase.cost.toLocaleString('ru-RU')}</span>
                                    <span> баллов.</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatDistanceToNow(new Date(purchase.date.seconds * 1000), { addSuffix: true, locale: ru })}
                                    <span> • Подтверждено: </span>
                                    <span className="font-medium">{`${purchase.admin?.firstName} ${purchase.admin?.lastName}`}</span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

function CommunityPageSkeleton() {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
           <Card>
            <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-start gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-3 w-3/4" />
                        </div>
                    </div>
                ))}
            </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
