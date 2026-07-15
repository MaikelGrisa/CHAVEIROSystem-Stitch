import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<typeof Input>, "type"> & {
  /** When true, use a text-style like PIN inputs (centered, tracked). */
  pinStyle?: boolean;
};

export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(
  { className, pinStyle, ...props },
  ref,
) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        ref={ref}
        {...props}
        type={show ? "text" : "password"}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
        aria-label={show ? "Ocultar" : "Mostrar"}
        tabIndex={-1}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});
