"use client";

import React, { useCallback, useRef, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { Modal } from "./Modal";
import { useLanguage } from "@/contexts/LanguageContext";

interface ConfirmState {
  message: string;
  danger: boolean;
  confirmLabel?: string;
}

/**
 * Promise-based replacement for window.confirm(), styled to match the app.
 * Usage:
 *   const { confirm, dialog } = useConfirm();
 *   if (!(await confirm(t("lots.deleteConfirm"), { danger: true }))) return;
 *   ...render {dialog} once, near the root of the component tree...
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback(
    (message: string, opts?: { danger?: boolean; confirmLabel?: string }) => {
      setState({ message, danger: opts?.danger ?? false, confirmLabel: opts?.confirmLabel });
      return new Promise<boolean>((resolve) => {
        resolver.current = resolve;
      });
    },
    []
  );

  const settle = (result: boolean) => {
    setState(null);
    resolver.current?.(result);
    resolver.current = null;
  };

  const dialog = (
    <ConfirmDialogUI
      state={state}
      onCancel={() => settle(false)}
      onConfirm={() => settle(true)}
    />
  );

  return { confirm, dialog };
}

function ConfirmDialogUI({
  state,
  onCancel,
  onConfirm,
}: {
  state: ConfirmState | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Modal
      open={!!state}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <button
            onClick={onCancel}
            className="h-10 px-4 rounded-md border border-border hover:bg-muted text-sm font-medium transition"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className={
              state?.danger
                ? "h-10 px-4 rounded-md bg-destructive text-background text-sm font-semibold hover:bg-destructive/90 transition-colors"
                : "h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            }
          >
            {state?.confirmLabel || t("common.confirm")}
          </button>
        </>
      }
    >
      {state && (
        <div className="flex items-start gap-3">
          {state.danger && (
            <div className="w-9 h-9 rounded-md bg-[#FDEBEC] flex items-center justify-center flex-shrink-0">
              <WarningCircle className="w-5 h-5 text-[#9F2F2D]" weight="bold" />
            </div>
          )}
          <p className="text-sm text-foreground pt-1.5">{state.message}</p>
        </div>
      )}
    </Modal>
  );
}
