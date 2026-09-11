import Link from "next/link";

export function Brand({
  href = "/",
  inverse = false,
}: {
  href?: string;
  inverse?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`brand ${inverse ? "brand-inverse" : ""}`}
      aria-label="Decola — início"
    >
      decola<span aria-hidden="true">✦</span>
    </Link>
  );
}
