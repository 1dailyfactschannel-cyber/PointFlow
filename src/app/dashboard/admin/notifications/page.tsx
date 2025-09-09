
"use client";

import { redirect } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Bell, Send } from "lucide-react";

import { useAuth } from '@/context/auth-provider';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNotificationStore } from '@/lib/notification-store';


const notificationSchema = z.object({
  title: z.string().min(1, "Заголовок обязателен."),
  body: z.string().min(1, "Текст уведомления обязателен."),
});

export default function NotificationsPage() {
    const { user: adminUser } = useAuth();
    const sendNotification = useNotificationStore(state => state.sendNotification);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof notificationSchema>>({
        resolver: zodResolver(notificationSchema),
        defaultValues: {
            title: "",
            body: "",
        },
    });

    if (!adminUser || adminUser.role !== 'admin') {
        redirect('/dashboard');
    }

    const onSubmit = (values: z.infer<typeof notificationSchema>) => {
        sendNotification({ title: values.title, body: values.body });
        toast({
            title: "Уведомление отправлено",
            description: "Все активные пользователи получили уведомление.",
        });
        form.reset();
    };

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-lg">
                           <Bell className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Отправить уведомление</CardTitle>
                            <CardDescription>Отправьте браузерное push-уведомление всем пользователям.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Заголовок</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Например: Важное объявление" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="body"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Текст уведомления</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Введите текст вашего сообщения здесь..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end">
                                <Button type="submit">
                                    <Send className="mr-2 h-4 w-4"/>
                                    Отправить всем
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
