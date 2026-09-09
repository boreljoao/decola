import { z } from "zod";

/**
 * Integrações externas (spec §14). Módulo puro: define o que cada integração
 * aceita e valida o formato do identificador.
 *
 * Regra de segurança: só aceitamos IDs validados por formato, nunca scripts
 * colados pelo usuário — um `<script>` arbitrário no app seria XSS na página
 * publicada.
 */

export type IntegrationKind = "meta_pixel" | "google_analytics" | "rd_station";

export interface IntegrationDef {
  kind: IntegrationKind;
  label: string;
  description: string;
  /** Categoria de consentimento que libera o carregamento. */
  consentCategory: "analytics" | "marketing";
  fieldLabel: string;
  placeholder: string;
  help: string;
  schema: z.ZodType<string>;
  /** Integrações que exigem chamada de servidor ainda não implementada. */
  available: boolean;
  unavailableReason?: string;
}

export const INTEGRATIONS: Record<IntegrationKind, IntegrationDef> = {
  meta_pixel: {
    kind: "meta_pixel",
    label: "Meta Pixel",
    description:
      "Mede resultados dos seus anúncios do Instagram e Facebook nas visitas da sua página.",
    consentCategory: "marketing",
    fieldLabel: "ID do Pixel",
    placeholder: "123456789012345",
    help: "Somente números, entre 10 e 20 dígitos. Encontre em Gerenciador de Eventos → Fontes de dados.",
    schema: z
      .string()
      .trim()
      .regex(/^\d{10,20}$/, "O ID do Pixel deve ter de 10 a 20 dígitos."),
    available: true,
  },
  google_analytics: {
    kind: "google_analytics",
    label: "Google Analytics 4",
    description:
      "Envia as visitas da sua página para a sua conta do Google Analytics.",
    consentCategory: "analytics",
    fieldLabel: "ID de medição",
    placeholder: "G-XXXXXXXXXX",
    help: "Formato G-XXXXXXXXXX, encontrado em Admin → Fluxos de dados.",
    schema: z
      .string()
      .trim()
      .regex(
        /^G-[A-Z0-9]{6,12}$/i,
        "O ID de medição tem o formato G-XXXXXXXXXX.",
      ),
    available: true,
  },
  rd_station: {
    kind: "rd_station",
    label: "RD Station",
    description:
      "Envia os contatos recebidos na sua página direto para o seu RD Station.",
    consentCategory: "analytics",
    fieldLabel: "Token público",
    placeholder: "—",
    help: "",
    schema: z.string().trim().min(8),
    available: false,
    unavailableReason:
      "A integração com o RD Station exige autenticação OAuth do provedor, ainda não configurada nesta versão. O envio de leads continua funcionando pelo painel e por e-mail.",
  },
};

/** Snippet permitido por integração — nunca script arbitrário do usuário. */
export function buildIntegrationScript(
  kind: IntegrationKind,
  id: string,
): string | null {
  switch (kind) {
    case "meta_pixel":
      // O id já passou pelo schema (só dígitos), então não há injeção possível.
      return `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');`;
    case "google_analytics":
      return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${id}',{anonymize_ip:true});`;
    default:
      return null;
  }
}

export function externalScriptSrc(
  kind: IntegrationKind,
  id: string,
): string | null {
  if (kind === "google_analytics") {
    return `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  }
  return null;
}
