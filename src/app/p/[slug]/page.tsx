import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { env } from "@/config/env";
import {
  loadPublishedBySlug,
  publishedMetadata,
  PublishedPage,
} from "@/features/pages/published";
import { publicPageAddress, publicPageUrl } from "@/features/pages/public-url";

/**
 * Página publicada servida por caminho, no mesmo host do app (decisão D-014).
 * Existe enquanto a Decola não tem domínio com DNS wildcard para o subdomínio
 * que a spec prevê.
 *
 * Mesma origem do painel, então sem scripts de terceiros: Meta Pixel e GA4
 * rodariam ao lado da sessão de quem estiver logado. Voltam sozinhos quando a
 * página passa a ser servida em subdomínio ou domínio próprio.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/p/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await loadPublishedBySlug(slug);
  return publishedMetadata(data, publicPageAddress(slug));
}

export default async function PathPublishedPage(props: PageProps<"/p/[slug]">) {
  const { slug } = await props.params;
  // Com subdomínio configurado, o endereço canônico é ele: a mesma página não
  // fica servida em duas origens.
  if (env().publishing === "subdomain") redirect(publicPageUrl(slug));

  const data = await loadPublishedBySlug(slug);
  if (!data) notFound();
  return <PublishedPage data={data} thirdPartyScripts={false} />;
}
