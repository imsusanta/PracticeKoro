export interface Student {
  id: string;
  email: string;
  full_name: string | null;
  whatsapp_number: string | null;
  avatar_url: string | null;
  age: number | null;
  created_at: string;
  approval_status?: {
    status: string;
    reviewed_at: string | null;
    expires_at: string | null;
  };
  purchases?: {
    id?: string;
    status: string;
    content_type?: string;
    created_at?: string;
  }[];
}

export const STATUS_LABELS: Record<string, string> = {
  approved: "Approved",
  pending: "Pending",
  rejected: "Rejected",
  deactivated: "Inactive",
  payment_locked: "Payment locked",
};

export function hasActiveSubscription(student: Pick<Student, "purchases">): boolean {
  return !!student.purchases?.some((purchase) => {
    if (purchase.content_type !== "subscription") return false;
    const expiryDate = new Date(purchase.created_at || "");
    expiryDate.setDate(expiryDate.getDate() + 365);
    return new Date() < expiryDate;
  });
}

export function getDisplayWhatsApp(student: Student): string | null {
  if (student.whatsapp_number) return student.whatsapp_number;
  if (student.email?.includes("@whatsapp.practicekoro.local")) {
    return student.email.split("@")[0];
  }
  return null;
}

export function getDisplayEmail(student: Student): string | null {
  if (!student.email || student.email.includes("@whatsapp")) return null;
  return student.email;
}

export function getApprovalStatus(student: Student): string {
  return student.approval_status?.status || "pending";
}

export function getEffectiveStatus(student: Student): string {
  return hasActiveSubscription(student) ? "approved" : getApprovalStatus(student);
}

export function getStudentInitials(name: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function formatJoinedDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getStatusBadgeClass(status?: string): string {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
    case "pending":
      return "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100";
    case "rejected":
      return "bg-red-100 text-red-700 border-red-200 hover:bg-red-100";
    case "deactivated":
      return "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100";
    case "payment_locked":
      return "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100";
  }
}

export function getAvatarFallbackClass(status: string): string {
  if (status === "approved") return "bg-gradient-to-br from-emerald-500 to-teal-600 text-white";
  if (status === "pending") return "bg-gradient-to-br from-amber-500 to-orange-500 text-white";
  if (status === "rejected") return "bg-gradient-to-br from-red-400 to-rose-500 text-white";
  return "bg-gradient-to-br from-slate-400 to-slate-500 text-white";
}
