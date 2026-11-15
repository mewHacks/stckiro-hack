import Link from "next/link";
import { LayoutDashboard, Smartphone } from "lucide-react";
import Logo from "@/components/Logo";
import VaultViewer from "@/components/VaultViewer";

// Full-screen 3D bag: the demo's opening shot.
export default function BagShowcase() {
  return (
    <div className="app-bg flex h-dvh flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 pt-5 md:px-8 md:pt-6">
        <div className="flex items-center gap-3">
          <Logo size={48} />
          <div>
            <h1 className="text-2xl text-white drop-shadow-sm md:text-4xl">LiveBuoy</h1>
            <p className="hidden text-sm font-bold text-white/85 sm:block">Protect what matters. Stay connected when it matters most.</p>
          </div>
        </div>
        <nav className="flex gap-2">
          <Link href="/app" className="pill flex items-center gap-1.5 px-4 py-2.5 text-sm font-extrabold text-brand-deep active:scale-95">
            <Smartphone size={16} /> <span>App</span>
            <span className="hidden sm:inline">&nbsp;demo</span>
          </Link>
          <Link href="/admin" className="btn-dark flex items-center gap-1.5 px-4 py-2.5 text-sm active:scale-95">
            <LayoutDashboard size={16} /> <span>Admin</span>
            <span className="hidden sm:inline">&nbsp;dashboard</span>
          </Link>
        </nav>
      </header>
      <div className="min-h-0 flex-1">
        <VaultViewer />
      </div>
    </div>
  );
}
