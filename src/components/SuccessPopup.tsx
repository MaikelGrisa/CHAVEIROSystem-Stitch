import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import logoUrl from "@/assets/logo.png";

export function SuccessPopup() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setMessage(detail || "Concluído com sucesso!");
      setOpen(true);
      const t = setTimeout(() => setOpen(false), 2200);
      return () => clearTimeout(t);
    };
    window.addEventListener("km-success-popup", handler);
    return () => window.removeEventListener("km-success-popup", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex justify-center mb-3">
            <img src={logoUrl} alt="Chaveiro TOP" className="w-20 h-20 object-contain" />
          </div>
          <DialogTitle className="text-center text-xl">{message}</DialogTitle>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

// Patch sonner's toast.success globally to show the centered popup instead.
import { toast } from "sonner";
const originalSuccess = toast.success.bind(toast);
type SuccessArgs = Parameters<typeof toast.success>;
let patched = false;
export function patchToastSuccess() {
  if (patched || typeof window === "undefined") return;
  patched = true;
  (toast as { success: (...a: SuccessArgs) => unknown }).success = ((message: unknown, ..._rest: unknown[]) => {
    const text = typeof message === "string" ? message : "Concluído com sucesso!";
    window.dispatchEvent(new CustomEvent("km-success-popup", { detail: text }));
    return text;
  }) as typeof originalSuccess;
}
