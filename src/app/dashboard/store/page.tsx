
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type Product, type PurchaseRequest } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-provider";
import { Wallet, CheckCircle, Clock } from "lucide-react";
import { collection, addDoc, query, onSnapshot, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";


export default function StorePage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setProducts([]);
      return;
    }

    const q = query(collection(db, "products"));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      },
      (error) => {
        console.error("Error in products listener:", error);
      }
    );
    return () => unsubscribe();
  }, [loading, user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "purchaseRequests"), where("userId", "==", user.id));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseRequest)));
      },
      (error) => {
        console.error("Error in requests listener:", error);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const handleRequest = async (product: Product) => {
    if (!user) return;

    const existingRequest = requests.find(r => r.productId === product.id && r.status === 'pending');
    if (existingRequest) {
      toast({
        variant: "default",
        title: "Заявка уже отправлена",
        description: `Вы уже отправили заявку на \"${product.name}\".`,
      });
      return;
    }
    
    await addDoc(collection(db, "purchaseRequests"), {
        userId: user.id,
        productId: product.id,
        status: 'pending',
        timestamp: serverTimestamp(),
    });

    toast({
      title: "Заявка отправлена!",
      description: `Ваша заявка на приобретение \"${product.name}\" отправлена на рассмотрение.`,
    });
  };
  
  const getButtonState = (productId: string) => {
      const request = requests.find(r => r.productId === productId && (r.status === 'pending' || r.status === 'approved'));
      if (request) {
          if (request.status === 'pending') {
              return { disabled: true, text: 'В ожидании', icon: <Clock className="mr-1 h-3 w-3" /> };
          }
          if (request.status === 'approved') {
              return { disabled: true, text: 'Одобрено', icon: <CheckCircle className="mr-1 h-3 w-3" /> };
          }
      }
      return { disabled: false, text: 'Подать заявку', icon: null };
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <div className="space-y-2 mb-8">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <Card key={index} className="flex flex-col overflow-hidden">
                <CardHeader className="p-3">
                    <Skeleton className="aspect-square w-full rounded-md" />
                    <Skeleton className="pt-2 h-5 w-full" />
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <Skeleton className="h-8 w-full" />
                </CardContent>
                <div className="flex-grow"></div>
                <CardFooter className="p-3 pt-0 flex items-center justify-between">
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-8 w-1/2" />
                </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Магазин</h1>
          <p className="text-muted-foreground">
              Выберите товары для приобретения за накопленные баллы.
          </p>
      </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {products.map((product, index) => {
            const { disabled, text, icon } = getButtonState(product.id);
            return (
                <Card key={product.id} className="flex flex-col overflow-hidden">
                    <CardHeader className="p-3">
                        <div className="relative aspect-square w-full overflow-hidden rounded-md">
                        <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                            priority={index < 10}
                        />
                        </div>
                        <CardTitle className="pt-2 text-base font-semibold leading-tight truncate">
                            {product.name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                       <CardDescription className="text-sm line-clamp-2">
                           {product.description}
                       </CardDescription>
                    </CardContent>
                    <div className="flex-grow"></div>
                    <CardFooter className="p-3 pt-0 flex items-center justify-between">
                        <div className="flex items-center gap-1 font-semibold">
                        <Wallet className="h-5 w-5 text-amber-500" />
                        <span>{product.price.toLocaleString('ru-RU')}</span>
                        </div>
                        <Button onClick={() => handleRequest(product)} disabled={disabled} size="sm" className="px-3 py-2 text-sm">
                            {icon}{text}
                        </Button>
                    </CardFooter>
                </Card>
            );
        })}
        </div>
    </div>
  );
}
