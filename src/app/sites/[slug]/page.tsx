import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  loadPublishedBySlug,
  publishedMetadata,
  PublishedPage,
} from "@/features/pages/published";

import { publicPageAddress } from "@/features/pages/public-url";
/**
 * Site publicado no subdomínio Decola (spec §11.1): serve exclusivamente a
 * versão publicada. Nenhum estado privado do app é acessível a partir daqui.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/sites/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await loadPublishedBySlug(slug);
  return publishedMetadata(data, publicPageAddress(slug));
}

export default async function PublishedSitePage(
  props: PageProps<"/sites/[slug]">,
) {
  const { slug } = await props.params;
  const data = await loadPublishedBySlug(slug);
  if (!data) notFound();
  return <PublishedPage data={data} />;
}
