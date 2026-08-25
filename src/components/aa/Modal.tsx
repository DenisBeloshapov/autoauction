"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

export type ModalSize = "sm" | "md" | "lg" | "fullscreen";

const sizeClass: Record<ModalSize, string> = {
  sm: "sm:max-w-[400px]",
  md: "sm:max-w-[560px]",
  lg: "sm:max-w-[720px]",
  fullscreen: "sm:max-w-[900px]",
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

  const isFullscreen = size === "fullscreen";

  return (
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            "fixed inset-0 z-[1000] flex justify-center",
            isFullscreen
              ? "items-stretch p-0"
              : "sm:items-center p-0 sm:p-6"
          )}
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === "string" ? title : "Dialog"}
          style={{ overscrollBehavior: "contain" }}
        >
          <motion.div
            className="absolute inset-0 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className={cn(
              "relative w-full bg-card border border-[#EAEAEA] overflow-hidden",
              isFullscreen
                ? "h-full sm:h-auto sm:max-h-[90vh] sm:my-auto sm:rounded-[12px]"
                : "sm:rounded-[12px] mt-auto sm:mt-0",
              sizeClass[size]
            )}
            initial={isFullscreen ? { scale: 0.96, opacity: 0 } : { y: "100%", opacity: 0 }}
            animate={isFullscreen ? { scale: 1, opacity: 1 } : { y: 0, opacity: 1 }}
            exit={isFullscreen ? { scale: 0.96, opacity: 0 } : { y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            style={{ overscrollBehavior: "contain" }}
          >
            {!isFullscreen && (
              <div className="sm:hidden pt-3 pb-1 flex justify-center">
                <div className="w-8 h-1 rounded-full bg-[#EAEAEA]" />
              </div>
            )}

            {title && (
              <div className="px-5 sm:px-6 pt-5 pb-4 flex items-center justify-between gap-4 border-b border-[#EAEAEA]">
                <h2 className="text-base sm:text-lg font-bold text-foreground">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-[6px] hover:bg-secondary transition"
                  aria-label="Close"
                >
                  <X size={16} weight="bold" aria-hidden="true" />
                </button>
              </div>
            )}
            <div className={cn(
              "px-5 sm:px-6 py-5 overflow-y-auto scroll-slim",
              isFullscreen ? "max-h-[calc(100vh-200px)] sm:max-h-[70vh]" : "max-h-[65vh] sm:max-h-[70vh]"
            )}>
              {children}
            </div>
            {footer && (
              <div className="px-5 sm:px-6 py-4 border-t border-[#EAEAEA] flex items-center justify-end gap-2">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
