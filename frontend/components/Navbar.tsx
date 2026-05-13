"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Zap } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/history", label: "History" },
  { href: "/portal", label: "Admin" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "saturate(180%) blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div className="page-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
              style={{
                background: "rgba(255,60,0,0.08)",
                border: "1px solid rgba(255,60,0,0.15)",
              }}
            >
              <Zap size={17} style={{ color: "#ff3c00" }} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-none">
              <span
                className="font-display font-bold tracking-tight"
                style={{ fontSize: "1.15rem", letterSpacing: "-0.02em", color: "#111827" }}
              >
                <span>Boom</span>
                <span style={{ color: "#ff3c00" }}>Tips25</span>
              </span>
              <span className="text-[9px] tracking-widest uppercase" style={{ color: "#9ca3af" }}>
                Premium Picks
              </span>
            </div>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${pathname === link.href ? "active" : ""}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 transition-colors rounded-xl"
            style={{ color: "#6b7280", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)" }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden transition-all duration-300 overflow-hidden ${
          mobileOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
        }`}
        style={{
          background: "rgba(255,255,255,0.98)",
          borderTop: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div className="page-container py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link text-base ${pathname === link.href ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
