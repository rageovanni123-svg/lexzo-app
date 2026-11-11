import { useState } from "react";
import { FaInstagram } from "react-icons/fa";

interface Props {
  handle: string;
}

const VALID_HANDLE = /^[A-Za-z0-9._]{1,30}$/;

/**
 * Prévia do perfil do Instagram, sem usar a API da Meta: mostra o embed público
 * do próprio Instagram (instagram.com/<perfil>/embed), carregado só quando a
 * seção chega perto da tela. Sempre há o botão para abrir o perfil, caso a
 * prévia não carregue (perfil privado, bloqueio do navegador, etc.).
 */
export function InstagramPreview({ handle }: Props) {
  const [loaded, setLoaded] = useState(false);
  const profileUrl = `https://instagram.com/${encodeURIComponent(handle)}`;
  const canEmbed = VALID_HANDLE.test(handle);

  return (
    <section className="mt-5 overflow-hidden rounded-2xl bg-card shadow-sm" aria-label={`Instagram @${handle}`}>
      <div className="flex items-center gap-3 p-3.5">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white">
          <FaInstagram className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-foreground">@{handle}</p>
          <p className="text-[13px] text-muted-foreground">Fotos e novidades no Instagram</p>
        </div>
      </div>

      {canEmbed && (
        <div className="relative h-[460px] border-t border-border bg-muted/40">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center text-[13px] text-muted-foreground">
              Carregando prévia…
            </div>
          )}
          <iframe
            title={`Prévia do Instagram de @${handle}`}
            src={`https://www.instagram.com/${encodeURIComponent(handle)}/embed`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            className="relative h-full w-full border-0"
          />
        </div>
      )}

      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 items-center justify-center border-t border-border bg-primary text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-95"
      >
        Ver todas as fotos no Instagram
      </a>
    </section>
  );
}
