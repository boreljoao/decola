import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { env } from "@/config/env";
import { getDb } from "@/server/db";
import { profiles, sessions } from "@/server/db/schema";
import { ensureProfile } from "./profile-service";
import type {
  AuthProvider,
  AuthResult,
  AuthUser,
  SignInInput,
  SignUpInput,
} from "./provider";

const COOKIE_NAME = "decola_dev_session";
const SESSION_DAYS = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Autenticação de DESENVOLVIMENTO (decisão D-004): passwordless, sessões
 * server-side com cookie httpOnly. Explicitamente identificada na UI e
 * recusada em produção. Não existe segundo banco de senhas.
 */
export class DevAuthProvider implements AuthProvider {
  readonly kind = "dev" as const;
  readonly capabilities = {
    passwordLogin: false,
    emailVerification: false,
    passwordRecovery: false,
    oauthGoogle: false,
  };

  constructor() {
    if (env().mode === "production") {
      throw new Error(
        "DevAuthProvider não pode ser usado em produção. Configure o Supabase Auth.",
      );
    }
  }

  private async createSession(user: AuthUser): Promise<void> {
    const db = await getDb();
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
    await db.insert(sessions).values({
      tokenHash: hashToken(token),
      profileId: user.profileId,
      expiresAt,
    });
    const store = await cookies();
    store.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: env().APP_URL.startsWith("https"),
      path: "/",
      expires: expiresAt,
    });
    // higiene: remove sessões expiradas deste perfil
    await db
      .delete(sessions)
      .where(
        and(
          eq(sessions.profileId, user.profileId),
          lt(sessions.expiresAt, new Date()),
        ),
      );
  }

  async signUp(input: SignUpInput): Promise<AuthResult> {
    const user = await ensureProfile({
      email: input.email,
      displayName: input.displayName ?? null,
    });
    await this.createSession(user);
    return { ok: true, user };
  }

  async signIn(input: SignInInput): Promise<AuthResult> {
    const db = await getDb();
    const email = input.email.trim().toLowerCase();
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.email, email),
    });
    if (!profile) {
      return {
        ok: false,
        code: "email_not_found",
        message: "Nenhuma conta encontrada com esse e-mail. Crie uma conta primeiro.",
      };
    }
    const user: AuthUser = {
      profileId: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      platformAdmin: profile.platformAdmin,
    };
    await this.createSession(user);
    return { ok: true, user };
  }

  async signOut(): Promise<void> {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (token) {
      const db = await getDb();
      await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
    }
    store.delete(COOKIE_NAME);
  }

  async getUser(): Promise<AuthUser | null> {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const db = await getDb();
    const row = await db
      .select({
        profileId: profiles.id,
        email: profiles.email,
        displayName: profiles.displayName,
        platformAdmin: profiles.platformAdmin,
      })
      .from(sessions)
      .innerJoin(profiles, eq(sessions.profileId, profiles.id))
      .where(
        and(
          eq(sessions.tokenHash, hashToken(token)),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return row[0] ?? null;
  }
}
