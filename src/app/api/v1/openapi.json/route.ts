import { NextResponse } from "next/server";
import { env } from "@/config/env";

/**
 * Especificação OpenAPI da API Business (spec §15). Documenta exatamente os
 * endpoints que existem — nada de rota prometida e não implementada.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "API Decola",
      version: "1.0.0",
      description:
        "API de integração da Decola. Autenticação por chave (Bearer). " +
        "Disponível no plano Business — a chave deixa de funcionar se o plano " +
        "perder o direito. Aplica o mesmo isolamento de workspace do aplicativo.",
    },
    servers: [{ url: `${env().APP_URL}/api/v1` }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Chave criada em Integrações. Formato: dk_live_...",
        },
      },
      schemas: {
        Erro: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
      },
    },
    paths: {
      "/paginas": {
        get: {
          summary: "Lista as páginas do workspace",
          description: "Escopo necessário: pages:read",
          responses: {
            "200": {
              description: "Lista de páginas",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string", format: "uuid" },
                            nome: { type: "string" },
                            status: { type: "string" },
                            endereco: { type: ["string", "null"] },
                            atualizadaEm: { type: "string", format: "date-time" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { description: "Chave ausente, inválida, revogada ou expirada" },
            "403": { description: "Escopo insuficiente ou plano sem API" },
            "429": { description: "Limite de requisições atingido" },
          },
        },
      },
      "/metricas": {
        get: {
          summary: "Métricas agregadas por página",
          description:
            "Escopo necessário: metrics:read. Nunca devolve dados de visitante " +
            "individual nem conteúdo de formulário. A taxa de conversão vem " +
            "sempre com o denominador usado.",
          responses: {
            "200": {
              description: "Métricas por página",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            paginaId: { type: "string", format: "uuid" },
                            nome: { type: "string" },
                            visitas: { type: "integer" },
                            cliquesCta: { type: "integer" },
                            cliquesWhatsapp: { type: "integer" },
                            leads: { type: "integer" },
                            taxaConversaoPct: { type: ["number", "null"] },
                            denominador: { type: "integer" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { description: "Não autenticado" },
            "403": { description: "Escopo insuficiente ou plano sem API" },
          },
        },
      },
      "/leads": {
        get: {
          summary: "Lista contatos recebidos",
          description: "Escopo necessário: leads:read",
          parameters: [
            {
              name: "paginaId",
              in: "query",
              schema: { type: "string", format: "uuid" },
              description: "Filtra por página",
            },
            {
              name: "limite",
              in: "query",
              schema: { type: "integer", maximum: 200, default: 50 },
            },
          ],
          responses: {
            "200": { description: "Lista de contatos" },
            "401": { description: "Não autenticado" },
            "403": { description: "Escopo insuficiente" },
          },
        },
        post: {
          summary: "Cria um contato",
          description:
            "Escopo necessário: leads:write. Use `chaveExterna` como chave de " +
            "idempotência: reenvios com a mesma chave não duplicam o contato.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["paginaId", "dados"],
                  properties: {
                    paginaId: { type: "string", format: "uuid" },
                    dados: {
                      type: "object",
                      properties: {
                        nome: { type: "string" },
                        email: { type: "string", format: "email" },
                        telefone: { type: "string" },
                        mensagem: { type: "string" },
                      },
                    },
                    chaveExterna: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Contato criado" },
            "200": { description: "Contato duplicado (idempotência)" },
            "400": { description: "Corpo inválido" },
            "404": { description: "Página não encontrada neste workspace" },
          },
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: { "cache-control": "public, max-age=300" },
  });
}
