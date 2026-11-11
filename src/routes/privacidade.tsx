import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

const UPDATED = "11 de novembro de 2026";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: `Política de Privacidade | ${SITE_NAME}` },
      { name: "description", content: `Como o ${SITE_NAME} trata dados pessoais, em linguagem simples.` },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-5 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar ao mapa
        </Link>

        <h1 className="letreiro mt-4 text-3xl font-extrabold">Política de Privacidade</h1>
        <p className="mt-1 text-sm text-muted-foreground">Atualizada em {UPDATED}</p>

        <div className="mt-6 space-y-6 text-[15px] leading-relaxed text-foreground/90">
          <p>
            O {SITE_NAME} é um mapa de lugares para comer e beber. Aqui explicamos, de forma simples, quais
            dados passam pelo app e o que fazemos com eles, conforme a Lei Geral de Proteção de Dados (LGPD, Lei
            13.709/2018).
          </p>

          <Section title="O que não pedimos">
            Você não precisa criar conta, informar nome, e-mail ou telefone para usar o mapa. Não vendemos dados
            e não fazemos perfil individual de visitantes.
          </Section>

          <Section title="Sua localização">
            Só usamos a sua localização se você tocar no botão de &quot;minha localização&quot;, e depois que o
            seu navegador pedir permissão. Ela é usada no próprio aparelho para centralizar o mapa e{" "}
            <strong>não é enviada nem guardada por nós</strong>. Você pode negar ou revogar a permissão nas
            configurações do navegador.
          </Section>

          <Section title="Estatísticas de uso">
            Usamos o Vercel Analytics para saber, de forma agregada e anônima, quantas pessoas acessam o site e
            quais páginas são mais vistas. Ele não usa cookies de rastreamento e não identifica você
            individualmente.
          </Section>

          <Section title="Serviços de terceiros">
            Para funcionar, o app carrega conteúdo de outros serviços, que podem receber o seu endereço IP e
            informações do navegador, como acontece em qualquer site:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Vercel (hospedagem do site) e Supabase (banco de dados dos lugares).</li>
              <li>OpenFreeMap e OpenStreetMap (imagens e dados do mapa).</li>
              <li>Google Fonts (tipografia) e provedores de imagem das fotos dos lugares.</li>
              <li>
                Instagram (ao abrir a página de um lugar que mostra o perfil dele) e links para WhatsApp, iFood e
                outros sites. Ao tocar neles, você passa a seguir as regras de privacidade de cada serviço.
              </li>
            </ul>
          </Section>

          <Section title="Dados dos estabelecimentos">
            As informações dos lugares (nome, endereço, telefone, horários, redes sociais) são dados comerciais
            públicos. Se você é dono ou responsável por um lugar e quer corrigir, atualizar ou remover essas
            informações, fale com a gente pelo contato abaixo.
          </Section>

          <Section title="Painel administrativo">
            A área de administração é restrita à equipe. Para entrar, é usado e-mail e senha, guardados com
            segurança pelo Supabase.
          </Section>

          <Section title="Seus direitos">
            Pela LGPD, você pode pedir confirmação de tratamento, acesso, correção, anonimização ou eliminação
            de dados, e informações sobre compartilhamento. Como não coletamos dados pessoais de visitantes além
            do que está descrito acima, na maioria dos casos não há nada seu para apagar, mas respondemos a
            qualquer pedido.
          </Section>

          <Section title="Crianças e adolescentes">
            O app não é direcionado a menores de 13 anos e não coleta dados de quem o usa.
          </Section>

          <Section title="Contato">
            {CONTACT_EMAIL ? (
              <>
                Dúvidas ou pedidos sobre seus dados:{" "}
                <a className="font-medium text-primary underline" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>
                .
              </>
            ) : (
              "Canal de contato em definição."
            )}
          </Section>

          <p className="text-sm text-muted-foreground">
            Podemos atualizar esta política. A data no topo mostra a última revisão.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-1">{children}</div>
    </section>
  );
}
