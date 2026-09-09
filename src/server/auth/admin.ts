import "server-only";
import { ForbiddenError, requireUser } from "./index";

/**
 * Privilégio administrativo da plataforma (spec §4/§16): separado de papel de
 * workspace e verificado no servidor em toda rota /admin.
 *
 * MFA obrigatório para admin é responsabilidade do provedor de identidade —
 * com Supabase Auth ativo, exija MFA no painel do provedor. Enquanto o modo de
 * desenvolvimento estiver em uso, o acesso admin fica restrito ao perfil
 * marcado no banco e nenhuma operação destrutiva é exposta.
 */
export async function requirePlatformAdmin() {
  const user = await requireUser();
  if (!user.platformAdmin) {
    throw new ForbiddenError(
      "Esta área é restrita à administração da plataforma.",
    );
  }
  return user;
}

/**
 * Variante que não lança: permite à página renderizar um estado de acesso
 * negado legível, em vez de devolver 500 com stack trace (spec §18).
 */
export async function getPlatformAdmin() {
  try {
    return await requirePlatformAdmin();
  } catch {
    return null;
  }
}
