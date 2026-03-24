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
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="max-w-[400px] rounded-[1.8rem] border-white/10 bg-black/95 backdrop-blur-2xl text-white shadow-2xl p-6">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl text-primary">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-white/60 text-[0.8rem] font-body mt-2 leading-relaxed italic opacity-80">
            "{description}"
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 gap-3 flex-row justify-end">
          <AlertDialogCancel onClick={onClose} className="mt-0 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white transition-all px-5 py-2 text-[0.65rem] uppercase tracking-widest font-bold">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={`rounded-xl transition-all px-6 py-2 text-[0.65rem] uppercase tracking-widest font-bold shadow-xl ${
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
