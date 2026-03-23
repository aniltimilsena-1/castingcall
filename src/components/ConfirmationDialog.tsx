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

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Continue",
  cancelText = "Cancel",
  variant = "default",
}: ConfirmationDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="rounded-[2rem] border-white/10 bg-black/90 backdrop-blur-2xl text-white shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-2xl text-primary">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-white/60 text-sm font-body mt-2 italic">
            "{description}"
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-8 gap-3">
          <AlertDialogCancel onClick={onClose} className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white transition-all px-6 py-2.5 text-[0.7rem] uppercase tracking-widest font-bold">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={`rounded-xl transition-all px-8 py-2.5 text-[0.7rem] uppercase tracking-widest font-bold shadow-xl ${
              variant === "destructive" 
                ? "bg-red-500 text-white hover:bg-red-600 shadow-red-500/20" 
                : "bg-primary text-black hover:bg-primary/90 shadow-primary/20"
            }`}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
