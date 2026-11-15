import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import VaultViewer from "@/components/VaultViewer";

export default function Vault() {
  return (
    <div className="flex h-full flex-col">
      <header className="relative flex items-center justify-center px-5 pb-2 pt-6">
        <Link href="/app" aria-label="Back" className="pill absolute left-5 grid size-10 place-items-center">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl text-white">SafeVault</h1>
      </header>
      <p className="text-center text-sm font-bold text-white/85">Waterproof · 5 items protected</p>
      <div className="min-h-0 flex-1">
        <VaultViewer />
      </div>
    </div>
  );
}
