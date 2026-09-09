import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { Badge, Card } from "@/components/ui";
import {
  ApiKeyManager,
  type ApiKeyView,
} from "@/features/api-keys/api-keys-ui";
import { getWorkspacePlan } from "@/features/billing/entitlements";
import { INTEGRATIONS, type IntegrationKind } from "@/features/integrations/definitions";
import { IntegrationCard } from "@/features/integrations/integrations-ui";
import { requireWorkspace } from "@/server/auth";
import { getDb } from "@/server/db";
import { apiKeys, integrationConnections } from "@/server/db/schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Integrações" };

export default async function IntegracoesPage() {
  const ctx = await requireWorkspace();
  const db = await getDb();

  const connections = await db.query.integrationConnections.findMany({
    where: eq(integrationConnections.workspaceId, ctx.workspaceId),
  });
  const byKind = new Map(connections.map((c) => [c.kind, c]));

  const plan = await getWorkspacePlan(ctx.workspaceId);
  const keyRows = await db.query.apiKeys.findMany({
    where: eq(apiKeys.workspaceId, ctx.workspaceId),
    orderBy: [desc(apiKeys.createdAt)],
  });
  const fmt = (date: Date) =>
    date.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  const apiKeyViews: ApiKeyView[] = keyRows.map((key) => ({
    id: key.id,
    name: key.name,
    prefix: key.prefix,
    scopes: (key.scopes as string[]) ?? [],
    createdAt: fmt(key.createdAt),
    lastUsedAt: key.lastUsedAt ? fmt(key.lastUsedAt) : null,
    revoked: key.revokedAt != null,
  }));

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <h1 style={{ fontFamily: "var(--font-sora)" }} className="text-3xl font-bold">
          Integrações
        </h1>
        <p className="mt-1 text-sm text-ink-600">
          Conecte suas ferramentas de medição. Os scripts só carregam nas suas
          páginas depois que o visitante aceitar — antes disso, ficam desligados.
        </p>
      </div>

      {(Object.keys(INTEGRATIONS) as IntegrationKind[]).map((kind) => {
        const definition = INTEGRATIONS[kind];
        const connection = byKind.get(kind);
        return (
          <Card key={kind}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{definition.label}</h2>
                <p className="mt-1 max-w-lg text-sm text-ink-600">
                  {definition.description}
                </p>
              </div>
              <Badge
                tone={
                  !definition.available
                    ? "warning"
                    : connection?.status === "connected"
                      ? "success"
                      : "neutral"
                }
              >
                {!definition.available
                  ? "aguardando configuração"
                  : connection?.status === "connected"
                    ? "conectado"
                    : "não conectado"}
              </Badge>
            </div>

            <div className="mt-5">
              <IntegrationCard
                kind={kind}
                label={definition.fieldLabel}
                placeholder={definition.placeholder}
                help={definition.help}
                available={definition.available}
                unavailableReason={definition.unavailableReason}
                currentValue={(connection?.config as { id?: string })?.id}
              />
            </div>
          </Card>
        );
      })}

      <p className="text-xs text-ink-600">
        A Decola aceita apenas identificadores validados por formato — nunca um
        trecho de código colado. Isso impede que um script de terceiros
        comprometa a sua página.
      </p>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">API de integração</h2>
            <p className="mt-1 max-w-lg text-sm text-ink-600">
              Consulte páginas, métricas agregadas e contatos a partir dos seus
              próprios sistemas.{" "}
              <a
                href="/api/v1/openapi.json"
                className="font-medium text-electric-600 hover:underline"
              >
                Ver especificação OpenAPI
              </a>
              .
            </p>
          </div>
          <Badge tone={plan.entitlements.api ? "success" : "warning"}>
            {plan.entitlements.api ? "disponível" : `não incluída no ${plan.name}`}
          </Badge>
        </div>

        <div className="mt-5">
          <ApiKeyManager
            keys={apiKeyViews}
            apiAllowed={plan.entitlements.api}
            planName={plan.name}
          />
        </div>
      </Card>
    </div>
  );
}
