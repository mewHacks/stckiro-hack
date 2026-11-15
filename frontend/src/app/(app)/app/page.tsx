import { Bell } from "lucide-react";
import Logo from "@/components/Logo";
import NetBadge from "@/components/NetBadge";
import VaultViewer from "@/components/VaultViewer";

export default function Home() {
  return (
    <div className="pt-6">
      <header className="flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <div>
            <p className="text-sm font-bold text-white/80">Stay ready,</p>
            <h1 className="text-[28px] leading-tight text-white drop-shadow-sm">LiveBuoy</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <NetBadge />
          <button aria-label="Alerts" className="pill grid size-10 place-items-center text-navy">
            <Bell size={18} />
          </button>
        </div>
      </header>

      {/* sealed backpack + item list (opening the bag is for the full-screen demo only) */}
      <VaultViewer app />
    </div>
  );
}
