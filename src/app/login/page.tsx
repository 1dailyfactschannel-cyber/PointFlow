
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email({ message: "Неверный формат email." }),
  password: z.string().min(1, { message: "Пароль не может быть пустым." }),
});

const forgotPasswordSchema = z.object({
    email: z.string().email({ message: "Неверный формат email." }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: "Вход выполнен",
        description: "Перенаправление на панель управления...",
      });
      router.push("/dashboard");
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Ошибка входа",
        description: "Неверный email или пароль.",
      });
    }
  }
  
  const handlePasswordReset = async (values: { email: string }) => {
    try {
      await sendPasswordResetEmail(auth, values.email);
      toast({
        title: "Письмо отправлено",
        description: "Проверьте свою почту для сброса пароля.",
      });
      setIsForgotPasswordOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось отправить письмо. Проверьте правильность email.",
      });
    }
  };


  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
               <Logo className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">Вход в StatusCraft</CardTitle>
            <CardDescription>
              Введите свои данные для входа в аккаунт
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="admin@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                       <div className="flex items-center justify-between">
                            <FormLabel>Пароль</FormLabel>
                            <Button
                                variant="link"
                                type="button"
                                className="h-auto p-0 text-sm"
                                onClick={() => setIsForgotPasswordOpen(true)}
                            >
                                Забыли пароль?
                            </Button>
                        </div>
                      <FormControl>
                         <div className="relative">
                            <Input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                {...field} 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-accent-foreground"
                                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                   {form.formState.isSubmitting ? "Вход..." : "Войти"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <ForgotPasswordDialog 
        isOpen={isForgotPasswordOpen} 
        onOpenChange={setIsForgotPasswordOpen}
        onSubmit={handlePasswordReset}
      />
    </>
  );
}

function ForgotPasswordDialog({ isOpen, onOpenChange, onSubmit }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onSubmit: (values: {email: string}) => Promise<void> }) {
  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });
  
  const handleSubmit = async (values: z.infer<typeof forgotPasswordSchema>) => {
      await onSubmit(values);
      form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Забыли пароль?</DialogTitle>
          <DialogDescription>
            Введите свой email, и мы отправим вам ссылку для восстановления пароля.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
                <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                        <Input placeholder="user@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="ghost">Отмена</Button>
                    </DialogClose>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Отправка...' : 'Отправить'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
