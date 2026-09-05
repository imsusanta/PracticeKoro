import React from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Loader2 } from "lucide-react";

interface DeleteAlertDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    description?: React.ReactNode;
    confirmText?: string;
    isDeleting?: boolean;
    itemName?: string;
}

export const DeleteAlertDialog: React.FC<DeleteAlertDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Deletion",
    description,
    confirmText = "Delete",
    isDeleting = false,
    itemName,
}) => {
    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent className="rounded-3xl border-0 shadow-2xl p-0 overflow-hidden max-w-md">
                <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 p-8 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4 text-red-600">
                        <AlertCircle className="w-10 h-10" />
                    </div>
                    <AlertDialogHeader className="space-y-2">
                        <AlertDialogTitle className="text-2xl font-bold text-slate-900">{title}</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600 text-base">
                            {description || (
                                <>
                                    Are you sure you want to delete {itemName ? <span className="font-bold text-slate-900">{itemName}</span> : "this item"}?
                                    This action cannot be undone.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                </div>
                <AlertDialogFooter className="p-6 bg-white flex sm:flex-row gap-3">
                    <AlertDialogCancel
                        disabled={isDeleting}
                        className="flex-1 h-12 rounded-xl border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 mt-0"
                    >
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                        }}
                        disabled={isDeleting}
                        className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg shadow-red-200 transition-all active:scale-95"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            confirmText
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
