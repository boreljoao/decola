import type { AuthErrorCode } from "./provider";

const GENERIC = "Não foi possível concluir agora. Tente de novo em instantes.";

/**
 * Traduz o erro do Supabase Auth pelo código estável. O texto original vem em
 * inglês e muda entre versões; a spec pede mensagem em pt-BR ligada a código
 * estável. Códigos conferidos em @supabase/auth-js (lib/error-codes.d.ts).
 */
export function describeSupabaseError(code: string | undefined): {
  code: AuthErrorCode;
  message: string;
} {
  switch (code) {
    case "user_already_exists":
    case "email_exists":
      return {
        code: "email_in_use",
        message: "Já existe uma conta com esse e-mail. Entre ou recupere a senha.",
      };
    case "invalid_credentials":
      return { code: "invalid_credentials", message: "E-mail ou senha incorretos." };
    case "email_not_confirmed":
      return {
        code: "email_not_confirmed",
        message: "Confirme seu e-mail antes de entrar.",
      };
    case "weak_password":
      return {
        code: "weak_password",
        message: "Essa senha é fraca. Use pelo menos 8 caracteres, com letras e números.",
      };
    case "same_password":
      return {
        code: "same_password",
        message: "A nova senha precisa ser diferente da atual.",
      };
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return {
        code: "rate_limited",
        message: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.",
      };
    case "otp_expired":
    case "flow_state_expired":
    case "flow_state_not_found":
    case "bad_code_verifier":
      return {
        code: "link_invalid",
        message: "Este link expirou ou já foi usado. Peça um novo.",
      };
    case "signup_disabled":
      return {
        code: "provider_error",
        message: "Novos cadastros estão desativados no momento.",
      };
    default:
      return { code: "provider_error", message: GENERIC };
  }
}
