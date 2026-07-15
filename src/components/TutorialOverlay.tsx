import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import animatedLogo from "@/assets/animated_logo.png";
import { Button } from "@/components/ui/button";

const STEPS = [
  { title: "Bem-vindo ao Chaveiro TOP!", text: "Eu sou a Chavinha 🔑 e vou te mostrar como tudo funciona em segundos." },
  { title: "Dashboard", text: "Veja num relance o valor do estoque, lucro do mês e produtos mais vendidos." },
  { title: "Produtos", text: "Cadastre, edite códigos e preços. Use a busca para encontrar tudo rapidamente." },
  { title: "Movimentações", text: "Registre entradas (compras) e vendas — tudo separado por mês." },
  { title: "Relatórios PDF", text: "Exporte o catálogo completo ou o fechamento mensal em PDF, com um clique." },
];

export function TutorialOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const next = () => last ? onClose() : setI(i + 1);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="max-w-md w-full p-4 text-center relative"
          >
            <div className="relative mb-8 inline-block w-full">
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                key={i}
                className="relative bg-white text-black rounded-[2rem] px-6 py-4 shadow-xl border border-black/5 mb-6 mx-auto"
              >
                <p className="text-sm font-semibold leading-relaxed tracking-wide">
                  {step.text}
                </p>
                {/* Speech bubble tail */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-t-[10px] border-t-white border-r-[10px] border-r-transparent" />
              </motion.div>

              <motion.img
                src={animatedLogo} alt="Chavinha"
                className="mx-auto w-32"
                animate={{ y: [0, -6, 0], rotate: [-3, 3, -3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <div className="mt-6 flex justify-center gap-1">
              {STEPS.map((_, n) => (
                <span key={n} className={`h-1.5 w-6 rounded-full transition ${n === i ? "bg-primary" : "bg-border"}`} />
              ))}
            </div>
            <div className="mt-6 flex justify-between gap-2">
              <Button variant="ghost" onClick={onClose}>Pular tutorial</Button>
              <Button onClick={next} className="bg-primary text-primary-foreground hover:opacity-90">
                {last ? "Começar!" : "Próximo"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
