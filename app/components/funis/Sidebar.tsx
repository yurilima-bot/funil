"use client";

type Page = "bd" | "ativos" | "descartados" | "changelog";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  badges: Record<string, number>;
}

function NavItem({
  page,
  icon,
  label,
  badgeClass,
  currentPage,
  onNavigate,
  badges,
}: {
  page: Page;
  icon: string;
  label: string;
  badgeClass?: string;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  badges: Record<string, number>;
}) {
  return (
    <div
      className={`nav-item ${currentPage === page ? "active" : ""}`}
      onClick={() => onNavigate(page)}
    >
      <div className="nav-icon">{icon}</div>
      {label}
      <span className={`nav-badge ${badgeClass || ""}`}>{badges[page] ?? 0}</span>
    </div>
  );
}

export default function Sidebar({ currentPage, onNavigate, badges }: SidebarProps) {
  return (
    <nav className="sidebar">
      <div className="logo-area">
        <div className="logo-name">Gestão de Funis</div>
        <div className="logo-tagline">Painel de controle</div>
      </div>
      <div className="nav-section">
        <div className="nav-label">Visão Geral</div>
        <NavItem page="bd" icon="📊" label="Base de Dados" currentPage={currentPage} onNavigate={onNavigate} badges={badges} />

        <div className="nav-label">Filtros</div>
        <NavItem page="ativos" icon="⚡" label="Ativos & Teste" currentPage={currentPage} onNavigate={onNavigate} badges={badges} />
        <NavItem page="descartados" icon="🗃" label="Descartados" badgeClass="disc" currentPage={currentPage} onNavigate={onNavigate} badges={badges} />

        <div className="nav-label">Sistema</div>
        <NavItem page="changelog" icon="📋" label="Alterações" currentPage={currentPage} onNavigate={onNavigate} badges={badges} />
      </div>
    </nav>
  );
}
