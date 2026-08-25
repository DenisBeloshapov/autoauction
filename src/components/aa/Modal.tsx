"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type ModalSize = "sm" | "md" | "lg" | "xl";

const sizeClass: Record<ModalSize, string> = {
  sm: "sm:max-w-[400px]",
  md: "sm:max-w-[560px]",
  lg: "sm:max-w-[720px]",
  xl: "sm:max-w-[920px]",
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  size?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, size = "md", children, footer }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[1000] flex sm:items-center justify-center p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={cn(
              "relative w-full bg-card border border-border overflow-hidden",
              // Mobile: bottom sheet (rounded top, full width, slides up)
              "aa-sheet sm:rounded-xl",
              "mt-auto sm:mt-0",
              sizeClass[size]
            )}
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.4 }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>

            {title && (
              <div className="px-5 sm:px-6 pt-4 sm:pt-5 pb-4 flex items-center justify-between gap-4">
                <h2 className="text-base sm:text-lg font-bold text-foreground">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-muted transition"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" weight="bold" />
                </button>
              </div>
            )}
            <div className="px-5 sm:px-6 py-5 max-h-[80vh] sm:max-h-[82vh] overflow-y-auto scroll-slim">
              {children}
            </div>
            {footer && (
              <div className="px-5 sm:px-6 py-4 border-t border-border/60 bg-muted/30 flex items-center justify-end gap-2">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
