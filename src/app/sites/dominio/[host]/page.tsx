import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  loadPublishedByDomain,
  publishedMetadata,
  PublishedPage,
} from "@/features/pages/published";

/**
 * Site publicado em domínio próprio (spec §11.2). O host chega pelo proxy e é
 * resolvido por um mapeamento VERIFICADO: só domínios com posse comprovada
 * servem página, o que impede usar host arbitrário para alcançar um tenant.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/sites/dominio/[host]">,
): Promise<Metadata> {
  const { host } = await props.params;
  const decoded = decodeURIComponent(host);
  const data = await loadPublishedByDomain(decoded);
  return publishedMetadata(data, decoded);
}

export default async function CustomDomainPage(
  props: PageProps<"/sites/dominio/[host]">,
) {
  const { host } = await props.params;
  const data = await loadPublishedByDomain(decodeURIComponent(host));
  if (!data) notFound();
  return <PublishedPage data={data} />;
}
