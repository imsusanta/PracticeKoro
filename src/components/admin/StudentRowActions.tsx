import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CheckCircle, Edit, Key, MessageSquare, MoreVertical, Sparkles, Trash2, User, UserCheck, UserX, XCircle } from "lucide-react";
import { getApprovalStatus, hasActiveSubscription, type Student } from "@/components/admin/studentManagementShared";

export type StudentRowAction =
  | "view"
  | "approve"
  | "reject"
  | "editActiveTime"
  | "resetPassword"
  | "paymentReminder"
  | "upgrade"
  | "deactivate"
  | "activate"
  | "delete";

interface StudentRowActionsProps {
  student: Student;
  onAction: (action: StudentRowAction, student: Student) => void;
}

const StudentRowActions = ({ student, onAction }: StudentRowActionsProps) => {
  const status = getApprovalStatus(student);
  const isPremium = hasActiveSubscription(student);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-lg hover:bg-emerald-50"
          aria-label={`Actions for ${student.full_name || "student"}`}
        >
          <MoreVertical className="size-4 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px] rounded-xl">
        <DropdownMenuItem onClick={() => onAction("view", student)} className="gap-2">
          <User className="size-4" /> View details
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {status === "pending" && (
          <>
            <DropdownMenuItem onClick={() => onAction("approve", student)} className="gap-2 text-emerald-600 focus:text-emerald-700">
              <CheckCircle className="size-4" /> Approve
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("reject", student)} className="gap-2 text-red-600 focus:text-red-600">
              <XCircle className="size-4" /> Reject
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("paymentReminder", student)} className="gap-2 text-blue-600 focus:text-blue-700">
              <MessageSquare className="size-4" /> Payment reminder
            </DropdownMenuItem>
            {!isPremium && (
              <DropdownMenuItem onClick={() => onAction("upgrade", student)} className="gap-2 text-amber-600 focus:text-amber-700">
                <Sparkles className="size-4" /> Upgrade to premium
              </DropdownMenuItem>
            )}
          </>
        )}
        {status === "approved" && (
          <>
            <DropdownMenuItem onClick={() => onAction("editActiveTime", student)} className="gap-2 text-indigo-600 focus:text-indigo-700">
              <Edit className="size-4" /> Edit active time
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("resetPassword", student)} className="gap-2">
              <Key className="size-4" /> Reset password
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("paymentReminder", student)} className="gap-2 text-blue-600 focus:text-blue-700">
              <MessageSquare className="size-4" /> Payment reminder
            </DropdownMenuItem>
            {!isPremium && (
              <DropdownMenuItem onClick={() => onAction("upgrade", student)} className="gap-2 text-amber-600 focus:text-amber-700">
                <Sparkles className="size-4" /> Upgrade to premium
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onAction("deactivate", student)} className="gap-2 text-orange-600 focus:text-orange-700">
              <UserX className="size-4" /> Deactivate
            </DropdownMenuItem>
          </>
        )}
        {(status === "rejected" || status === "deactivated" || status === "payment_locked") && (
          <>
            <DropdownMenuItem onClick={() => onAction("activate", student)} className="gap-2 text-emerald-600 focus:text-emerald-700">
              <UserCheck className="size-4" /> Activate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("paymentReminder", student)} className="gap-2 text-blue-600 focus:text-blue-700">
              <MessageSquare className="size-4" /> Payment reminder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("delete", student)} className="gap-2 text-red-600 focus:text-red-600">
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StudentRowActions;
