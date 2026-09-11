import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/brand";
import { MarketingHeader } from "@/components/marketing/header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-shell">
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <MarketingHeader />
      <div id="conteudo" tabIndex={-1} className="marketing-content">
        {children}
      </div>
      <footer className="site-footer">
        <div className="site-container footer-grid">
          <div>
            <Brand />
            <p>
              Boas ideias merecem
              <br />
              encontrar seus clientes.
            </p>
            <Link href="/cadastro" className="text-link">
              Vamos decolar <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <nav aria-label="Produto">
            <span className="footer-label">Explore</span>
            <Link href="/como-funciona">Como funciona</Link>
            <Link href="/exemplos">Exemplos</Link>
            <Link href="/precos">Preços</Link>
            <Link href="/profissionais">Profissionais</Link>
          </nav>
          <nav aria-label="Empresa">
            <span className="footer-label">Decola</span>
            <Link href="/agencias">Para agências</Link>
            <Link href="/contato">Fale com a gente</Link>
            <Link href="/entrar">Minha conta</Link>
          </nav>
          <nav aria-label="Legal">
            <span className="footer-label">Transparência</span>
            <Link href="/termos">Termos de uso</Link>
            <Link href="/privacidade">Privacidade</Link>
            <Link href="/cookies">Cookies</Link>
          </nav>
        </div>
        <div className="site-container footer-bottom">
          <span>© {new Date().getFullYear()} Decola</span>
          <span>Feita para negócios brasileiros.</span>
          <span>Plataforma em desenvolvimento</span>
        </div>
      </footer>
    </div>
  );
}
