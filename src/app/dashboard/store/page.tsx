
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type Product, type PurchaseRequest } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-provider";
import { Wallet, CheckCircle, Clock, Plus, Minus } from "lucide-react";
import { collection, addDoc, query, onSnapshot, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";


export default function StorePage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const handleRequest = async (product: Product | null, quant: number) => {
    if (!user || !product) return;

    if (quant <= 0) {
        toast({ variant: "destructive", title: "Неверное количество", description: "Количество должно быть больше нуля." });
        return;
    }
    if (quant > product.stock) {
        toast({ variant: "destructive", title: "Недостаточно товара", description: `В наличии только ${product.stock} шт.` });
        return;
    }
    if (user.balance < product.price * quant) {
        toast({ variant: "destructive", title: "Недостаточно средств", description: "У вас не хватает баллов для этого заказа." });
        return;
    }

    await addDoc(collection(db, "purchaseRequests"), {
        userId: user.id,
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        quantity: quant,
        status: 'pending',
        timestamp: serverTimestamp(),
    });

    toast({
      title: "Заявка отправлена!",
      description: `Ваша заявка на ${quant} шт. \"${product.name}\" отправлена.`
    });

    setIsDialogOpen(false);
  };
  
  const openRequestDialog = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setIsDialogOpen(true);
  }

  const adjustQuantity = (amount: number) => {
    if (!selectedProduct) return;
    setQuantity(prev => {
        const newQuantity = prev + amount;
        if (newQuantity < 1) return 1;
        if (newQuantity > selectedProduct.stock) return selectedProduct.stock;
        return newQuantity;
    });
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <div className="space-y-2 mb-8">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <Card key={index} className="flex flex-col overflow-hidden">
                <CardHeader className="p-2 pb-0">
                    <Skeleton className="aspect-square w-full rounded-md" />
                    <Skeleton className="pt-2 h-4 w-full" />
                </CardHeader>
                 <CardFooter className="p-2 pt-2 flex items-center justify-between">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-7 w-1/2" />
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {products.map((product, index) => {
            const request = requests.find(r => r.productId === product.id && r.status === 'pending');
            return (
                <Card key={product.id} className="flex flex-col overflow-hidden text-sm">
                    <CardHeader className="p-2 pb-0">
                        <div className="relative aspect-square w-full overflow-hidden rounded-md">
                        <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                            priority={index < 12} 
                        />
                        </div>
                        <CardTitle className="pt-2 text-xs font-semibold leading-tight truncate h-8 flex items-center">
                            {product.name}
                        </CardTitle>
                    </CardHeader>
                    <div className="flex-grow"></div>
                    <CardFooter className="p-2 pt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1 font-semibold text-xs">
                        <Wallet className="h-4 w-4 text-amber-500" />
                        <span>{product.price.toLocaleString('ru-RU')}</span>
                        </div>
                        <Button onClick={() => openRequestDialog(product)} size="xs" className="h-7 px-2 text-xs">
                            Заказать
                        </Button>
                    </CardFooter>
                </Card>
            );
        })}
        </div>
         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
                {selectedProduct && (
                    <>
                        <DialogHeader>
                            <DialogTitle>{selectedProduct.name}</DialogTitle>
                            <DialogDescription>
                                Доступно для заказа: {selectedProduct.stock} шт.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="flex items-center justify-center space-x-2">
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => adjustQuantity(-1)} disabled={quantity <= 1}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <Input
                                    type="number"
                                    className="w-20 text-center"
                                    value={quantity}
                                    onChange={(e) => {
                                        const newQuant = parseInt(e.target.value, 10);
                                        if (e.target.value === '' || isNaN(newQuant)) {
                                            setQuantity(1); 
                                        } else if (newQuant > 0 && newQuant <= selectedProduct.stock) {
                                            setQuantity(newQuant);
                                        }
                                    }}
                                    min="1"
                                    max={selectedProduct.stock}
                                />
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => adjustQuantity(1)} disabled={quantity >= selectedProduct.stock}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="text-center text-lg font-semibold">
                                Итого: {(selectedProduct.price * quantity).toLocaleString('ru-RU')} баллов
                            </div>
                            {user && <div className="text-center text-sm text-muted-foreground">
                                Ваш баланс: {user.balance.toLocaleString('ru-RU')} баллов
                            </div>}
                        </div>
                        <DialogFooter>
                            <Button
                                onClick={() => handleRequest(selectedProduct, quantity)}
                                disabled={!user || user.balance < selectedProduct.price * quantity || quantity > selectedProduct.stock}
                            >
                                Подать заявку
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    </div>
  );
}
