import React, { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from "react";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";

interface ConfirmOptions {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ConfirmationContextType {
  confirm: (options: ConfirmOptions) => void;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error("useConfirmation must be used within a ConfirmationProvider");
  }
  return context;
};

export const ConfirmationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const optionsRef = useRef<ConfirmOptions | null>(null);
  const timeoutRef = useRef<number | null>(null);
  
  const confirm = useCallback((newOptions: ConfirmOptions) => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    optionsRef.current = newOptions;
    setOptions(newOptions);
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setIsOpen(false);
    const callback = optionsRef.current?.onCancel;
    optionsRef.current = null;
    callback?.();

    timeoutRef.current = window.setTimeout(() => {
      setOptions(null);
      timeoutRef.current = null;
    }, 400);
  }, []);

  const handleConfirm = useCallback(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setIsOpen(false);
    const callback = optionsRef.current?.onConfirm;
    optionsRef.current = null;
    callback?.();

    timeoutRef.current = window.setTimeout(() => {
      setOptions(null);
      timeoutRef.current = null;
    }, 400);
  }, []);

  useEffect(() => {
    return () => { if (timeoutRef.current) window.clearTimeout(timeoutRef.current); };
  }, []);

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      {options && (
        <ConfirmationDialog
          isOpen={isOpen}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title={options.title || "Confirmation Required"}
          description={options.description}
          confirmText={options.confirmLabel}
          cancelText={options.cancelLabel}
          variant={options.variant}
        />
      )}
    </ConfirmationContext.Provider>
  );
};
