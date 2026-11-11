import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Phone, X } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

interface Props {
  /** Nome do lugar (aparece no título da escolha). */
  name: string;
  phone: string;
  /** WhatsApp próprio do lugar; se faltar, usa o telefone. */
  whatsapp?: string | null;
  /** Desenha o botão que abre a escolha. */
  children: (open: () => void) => ReactNode;
}

const digits = (s: string) => s.replace(/\D/g, "");

/** Número no formato do wa.me: com DDI 55 quando vier só com DDD + número. */
function waNumber(raw: string): string {
  const d = digits(raw);
  return d.length <= 11 ? `55${d}` : d;
}

/** Ao tocar no telefone, pergunta se a pessoa quer ligar ou chamar no WhatsApp. */
export function PhoneActions({ name, phone, whatsapp, children }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const close = () => setIsOpen(false);

  return (
    <>
      {children(() => setIsOpen(true))}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Falar com ${name}`}>
            <button aria-label="Fechar" onClick={close} className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]" />
            <div className="relative w-full max-w-md rounded-t-[26px] bg-white p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[26px]">
              <div className="flex items-start justify-between gap-3 px-1 pb-3">
                <div className="min-w-0">
                  <p className="truncate text-[17px] font-semibold text-foreground">Falar com {name}</p>
                  <p className="text-[13px] text-muted-foreground">{phone}</p>
                </div>
                <button onClick={close} aria-label="Fechar" className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-col gap-2.5">
                <a
                  href={`tel:${digits(phone)}`}
                  onClick={close}
                  className="flex h-14 items-center gap-3 rounded-2xl bg-primary px-4 text-[16px] font-semibold text-primary-foreground"
                >
                  <Phone className="h-5 w-5" /> Ligar
                </a>
                <a
                  href={`https://wa.me/${waNumber(whatsapp || phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={close}
                  className="flex h-14 items-center gap-3 rounded-2xl bg-[#25D366] px-4 text-[16px] font-semibold text-white"
                >
                  <FaWhatsapp className="h-5 w-5" /> Abrir no WhatsApp
                </a>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
