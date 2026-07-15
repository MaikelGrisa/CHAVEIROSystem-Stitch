import { useEffect, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/logo.png";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  requirePin?: boolean;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  requirePin = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [pinStage, setPinStage] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    if (!open) {
      setPinStage(false);
      setPin("");
      setPinError("");
    }
  }, [open]);

  const handleFirstConfirm = () => {
    if (requirePin) {
      setPinStage(true);
    } else {
      onConfirm();
      onOpenChange(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");
    const { data, error } = await supabase.from("app_settings").select("value").eq("key", "delete_pin").maybeSingle();
    if (error) { setPinError("Erro ao validar PIN"); return; }
    const stored = (data?.value as string | null) ?? "";
    if (!stored) { setPinError("Nenhum PIN configurado. Peça ao ADM para definir."); return; }
    if (pin.trim() !== stored) { setPinError("PIN incorreto"); return; }
    onConfirm();
    onOpenChange(false);
  };

  if (pinStage) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <img src={logoUrl} alt="Chaveiro TOP" className="w-16 h-16 object-contain" />
            </div>
            <DialogTitle className="text-center">Digite o PIN do administrador</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePinSubmit} className="space-y-3">
            <PasswordInput
              autoFocus
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="text-center tracking-widest text-lg"
            />
            {pinError && <p className="text-sm text-destructive text-center">{pinError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{cancelLabel}</Button>
              <Button type="submit" className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}>{destructive ? "Confirmar exclusão" : "Confirmar edição"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex justify-center mb-2">
            <img src={logoUrl} alt="Chaveiro TOP" className="w-16 h-16 object-contain" />
          </div>
          <AlertDialogTitle className="text-center">{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-center">{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            onClick={(e) => { e.preventDefault(); handleFirstConfirm(); }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
