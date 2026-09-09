import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pacotes com binários/WASM que não devem ser empacotados pelo bundler.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  // Cabeçalhos de segurança baseline (spec §16). CSP completa com nonce entra
  // junto com as integrações de terceiros que a exigirem.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
