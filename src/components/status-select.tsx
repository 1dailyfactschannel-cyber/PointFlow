
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Status } from "@/lib/data";
import { useAuth } from "@/context/auth-provider";
import { StatusBadge } from "./status-badge";
import { useToast } from "@/hooks/use-toast";

const statusOptions: { value: Status; label: string }[] = [
  { value: "online", label: "В сети" },
  { value: "offline", label: "Не в сети" },
  { value: "sick", label: "Больничный" },
  { value: "vacation", label: "Отпуск" },
];

export function StatusSelect() {
  const { user, updateStatus } = useAuth();
  const { toast } = useToast();

  if (!user) return null;

  const handleStatusChange = (newStatus: Status) => {
    updateStatus(newStatus);
    toast({
      title: "Статус обновлен",
      description: `Ваш новый статус: ${statusOptions.find(s => s.value === newStatus)?.label}`,
    });
  };

  return (
    <Select onValueChange={handleStatusChange} value={user.status}>
      <SelectTrigger className="w-auto focus:ring-0 focus:ring-offset-0 border-0 bg-transparent shadow-none group-hover:bg-accent/50">
        <SelectValue asChild>
          <div className="flex items-center gap-2">
            <StatusBadge status={user.status} />
            <span className="hidden sm:inline">{statusOptions.find(s => s.value === user.status)?.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
