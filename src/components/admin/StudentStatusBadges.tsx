import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock } from "lucide-react";
import {
  getAvatarFallbackClass,
  getEffectiveStatus,
  getStatusBadgeClass,
  getStudentInitials,
  hasActiveSubscription,
  STATUS_LABELS,
  type Student,
} from "@/components/admin/studentManagementShared";
import { cn } from "@/lib/utils";

export const StudentAvatar = ({ student, className }: { student: Student; className?: string }) => {
  const status = getEffectiveStatus(student);

  return (
    <Avatar className={cn("size-10", className)}>
      {student.avatar_url && <AvatarImage src={student.avatar_url} alt={student.full_name || "Student"} />}
      <AvatarFallback className={cn("text-sm font-semibold", getAvatarFallbackClass(status))}>
        {getStudentInitials(student.full_name)}
      </AvatarFallback>
    </Avatar>
  );
};

export const StudentStatusBadge = ({ student, compact = false }: { student: Student; compact?: boolean }) => {
  const status = getEffectiveStatus(student);

  return (
    <Badge
      variant="secondary"
      className={cn(
        "w-fit border font-semibold capitalize",
        compact ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs",
        getStatusBadgeClass(status),
      )}
    >
      {STATUS_LABELS[status] || status}
    </Badge>
  );
};

export const StudentPlanBadge = ({ student, compact = false }: { student: Student; compact?: boolean }) => {
  const isPremium = hasActiveSubscription(student);

  if (isPremium) {
    return (
      <Badge className={cn("border-0 bg-amber-500 text-white hover:bg-amber-500", compact ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs")}>
        Premium
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn("border-gray-200 text-gray-500", compact ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs")}
    >
      Free
    </Badge>
  );
};

export const StudentExpiryHint = ({ student }: { student: Student }) => {
  const expiresAt = student.approval_status?.expires_at;
  if (getEffectiveStatus(student) !== "approved" || !expiresAt) return null;

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
      <Clock className="size-3" />
      Expires {new Date(expiresAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
    </span>
  );
};
