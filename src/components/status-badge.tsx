import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Status } from "@/lib/data";

type StatusBadgeProps = {
  status: Status;
};

const statusMap: Record<
  Status,
  { text: string; className: string }
> = {
  online: { text: "В сети", className: "bg-green-500 hover:bg-green-500/80" },
  offline: { text: "Не в сети", className: "bg-gray-500 hover:bg-gray-500/80" },
  sick: { text: "Больничный", className: "bg-yellow-500 hover:bg-yellow-500/80" },
  vacation: { text: "Отпуск", className: "bg-blue-500 hover:bg-blue-500/80" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { text, className } = statusMap[status] || statusMap.offline;

  return (
    <Badge className={cn("text-white", className)}>
      {text}
    </Badge>
  );
}
