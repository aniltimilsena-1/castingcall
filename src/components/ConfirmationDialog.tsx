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
import { AlertTriangle, ShieldAlert } from "lucide-react";

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
      <AlertDialogContent className="max-w-[360px] rounded-[2.2rem] border border-white/10 bg-zinc-950/90 backdrop-blur-3xl text-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
        
        <AlertDialogHeader className="relative z-10">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={`p-3 rounded-2xl ${variant === 'destructive' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'} border border-current opacity-60 mb-2`}>
              {variant === 'destructive' ? <ShieldAlert size={28} /> : <AlertTriangle size={28} />}
            </div>
            <AlertDialogTitle className="font-display text-2xl tracking-tight text-white/90">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/50 text-[0.85rem] font-body leading-relaxed max-w-[280px]">
              {description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-8 flex-col sm:flex-row gap-3 relative z-10 items-center justify-center">
          <AlertDialogCancel 
            onClick={onClose} 
            className="w-full sm:w-auto mt-0 rounded-2xl border-white/5 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all px-8 py-2.5 text-[0.6rem] uppercase tracking-[0.2em] font-black"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={`w-full sm:w-auto rounded-2xl transition-all px-8 py-2.5 text-[0.6rem] uppercase tracking-[0.2em] font-black shadow-2xl ${
              variant === "destructive" 
                ? "bg-red-500 text-white hover:bg-red-600 shadow-red-500/20" 
                : "bg-primary text-foreground hover:bg-primary/90 shadow-primary/20"
            }`}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
