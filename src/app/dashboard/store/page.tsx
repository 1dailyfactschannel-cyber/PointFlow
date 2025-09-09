
"use client";

import { useState, useEffect, useMemo } from "react";
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


export default function StorePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);

  useEffect(() => {
    const q = query(collection(db, "products"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "purchaseRequests"), where("userId", "==", user.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseRequest)));
    });
    return () => unsubscribe();
  }, [user]);

  const handleRequest = async (product: Product) => {
    if (!user) return;

    const existingRequest = requests.find(r => r.productId === product.id && r.status === 'pending');
    if (existingRequest) {
      toast({
        variant: "default",
        title: "Заявка уже отправлена",
        description: `Вы уже отправили заявку на "${product.name}".`,
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
      description: `Ваша заявка на приобретение "${product.name}" отправлена на рассмотрение.`,
    });
  };
  
  const getButtonState = (productId: string) => {
      const request = requests.find(r => r.productId === productId && (r.status === 'pending' || r.status === 'approved'));
      if (request) {
          if (request.status === 'pending') {
              return { disabled: true, text: 'В ожидании', icon: <Clock className="mr-2 h-4 w-4" /> };
          }
          if (request.status === 'approved') {
              return { disabled: true, text: 'Одобрено', icon: <CheckCircle className="mr-2 h-4 w-4" /> };
          }
      }
      return { disabled: false, text: 'Подать заявку' };
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => {
            const { disabled, text, icon } = getButtonState(product.id);
            return (
                <Card key={product.id} className="flex flex-col">
                    <CardHeader>
                        <div className="relative aspect-video w-full overflow-hidden rounded-md">
                        <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover"
                            data-ai-hint="product image"
                        />
                        </div>
                        <CardTitle className="pt-4">{product.name}</CardTitle>
                        <CardDescription>{product.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow"></CardContent>
                    <CardFooter className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-semibold text-lg">
                        <Wallet className="h-5 w-5 text-amber-500" />
                        <span>{product.price.toLocaleString('ru-RU')}</span>
                        </div>
                        <Button onClick={() => handleRequest(product)} disabled={disabled}>
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
