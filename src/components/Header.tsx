// src/components/Header.tsx
import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-stone-800 bg-stone-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" fill="#1c1917" />
              <rect x="9" y="2" width="5" height="5" fill="#1c1917" />
              <rect x="2" y="9" width="5" height="5" fill="#1c1917" />
              <rect x="9" y="9" width="5" height="5" fill="#1c1917" opacity="0.4" />
            </svg>
          </div>
          <span className="font-bold text-xl tracking-tight text-stone-50">allo</span>
        </Link>
        <span className="font-mono text-xs text-stone-500 hidden sm:block">
          Inventory Platform
        </span>
      </div>
    </header>
  );
}
