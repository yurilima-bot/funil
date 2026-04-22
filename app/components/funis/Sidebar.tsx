"use client";

export type AppPage = "mapa" | "changelog";
type Page = AppPage;

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
  indent = false,
}: {
  page: Page;
  icon: string;
  label: string;
  badgeClass?: string;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  badges: Record<string, number>;
  indent?: boolean;
}) {
  return (
    <div
      className={`nav-item ${currentPage === page ? "active" : ""} ${indent ? "nav-indent" : ""}`}
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
        <div className="logo-name">Funnelytics</div>
        <div className="logo-tagline">Gestão de Funis</div>
      </div>
      <div className="nav-section">
        <div className="nav-label">Visão Geral</div>
        <NavItem page="mapa" icon="🗺" label="Mapa Geral" currentPage={currentPage} onNavigate={onNavigate} badges={badges} />

        <div className="nav-label">Sistema</div>
        <NavItem page="changelog" icon="📋" label="Alterações" currentPage={currentPage} onNavigate={onNavigate} badges={badges} />
      </div>
    </nav>
  );
}
