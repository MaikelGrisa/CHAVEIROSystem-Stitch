import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import animatedLogo from "@/assets/animated_logo.png";

interface Props {
  tip?: string;
  size?: number;
  bobbing?: boolean;
}

export function MascotKey({ tip, size = 56, bobbing = true }: Props) {
  const [show, setShow] = useState(false);
  const [currentTip, setCurrentTip] = useState<string | undefined>(tip);

  useEffect(() => {
    if (!tip) return;
    setCurrentTip(tip);
    setShow(true);
    const t = setTimeout(() => setShow(false), 5000);
    return () => clearTimeout(t);
  }, [tip]);

  useEffect(() => {
    const handleSale = () => {
      const expressions = ["Eita!", "Uau!", "É isso Aí!", "Sensacional!", "Vendido!", "Boa!"];
      const randomExpression = expressions[Math.floor(Math.random() * expressions.length)];
      setCurrentTip(`${randomExpression} 🚀 Mais uma venda realizada com sucesso! 🎉`);
      setShow(true);
      setTimeout(() => setShow(false), 5000);
    };

    window.addEventListener("km-sale-success", handleSale);
    return () => window.removeEventListener("km-sale-success", handleSale);
  }, []);

  return (
    <div className="relative inline-flex items-center">
      <motion.img
        src={animatedLogo}
        alt="Mascote Chaveiro TOP"
        style={{ width: size, height: "auto" }}
        animate={bobbing ? { y: [0, -6, 0], rotate: [-3, 3, -3] } : {}}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.1, rotate: 12 }}
        className="cursor-help"
        onClick={() => setShow(!show)}
      />
      <AnimatePresence>
        {show && currentTip && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.8 }}
            className="absolute bottom-full right-0 mb-4 z-50 w-max max-w-[min(280px,calc(100vw-2rem))]"
          >
            <div className="relative bg-white rounded-[1.25rem] px-3 py-2 shadow-xl border border-black/5">
              {/* Speech bubble tail */}
              <div
                className="absolute -bottom-[8px] w-0 h-0 border-l-[8px] border-l-transparent border-t-[8px] border-t-white border-r-[8px] border-r-transparent"
                style={{ right: `calc(${size / 2}px - 8px)` }}
              />

              <p className="text-[12px] font-semibold text-black leading-snug text-center tracking-wide break-words">
                {currentTip}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
