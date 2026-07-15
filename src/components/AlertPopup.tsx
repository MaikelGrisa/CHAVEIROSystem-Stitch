import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import logoUrl from "@/assets/logo.png";

type AlertVariant = "error" | "warning" | "info";

type AlertDetail = { message: string; variant: AlertVariant };

export function AlertPopup() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<AlertDetail>({ message: "", variant: "info" });

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<AlertDetail>).detail;
      setDetail(d);
      setOpen(true);
      const t = setTimeout(() => setOpen(false), 2800);
      return () => clearTimeout(t);
    };
    window.addEventListener("km-alert-popup", handler);
    return () => window.removeEventListener("km-alert-popup", handler);
  }, []);

  const color =
    detail.variant === "error"
      ? "text-destructive"
      : detail.variant === "warning"
        ? "text-amber-500"
        : "text-primary";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex justify-center mb-3">
            <img src={logoUrl} alt="Alerta" className="w-20 h-20 object-contain" />
          </div>
          <DialogTitle className={`text-center text-xl flex items-center justify-center gap-2 ${color}`}>
            <AlertTriangle className="size-6" />
            {detail.message}
          </DialogTitle>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

import { toast } from "sonner";
let patched = false;
export function patchToastAlerts() {
  if (patched || typeof window === "undefined") return;
  patched = true;
  const dispatch = (message: unknown, variant: AlertVariant) => {
    const text = typeof message === "string" ? message : "Atenção!";
    window.dispatchEvent(
      new CustomEvent<AlertDetail>("km-alert-popup", { detail: { message: text, variant } }),
    );
    return text;
  };
  (toast as unknown as { error: (m: unknown) => unknown }).error = ((m: unknown) =>
    dispatch(m, "error")) as never;
  (toast as unknown as { warning: (m: unknown) => unknown }).warning = ((m: unknown) =>
    dispatch(m, "warning")) as never;
}
