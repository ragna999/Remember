import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

// Responsive Navbar + Hamburger
export default function Navbar({ links }) {
  const router = useRouter();
  const defaultLinks = [
    { href: "/", label: "Home" },
    { href: "/edit", label: "Edit" },
    { href: "/nft-layer", label: "Nft Layering" },
    { href: "/faq", label: "Blog" }
  ];

  const items = Array.isArray(links) && links.length ? links : defaultLinks;

  const [menuOpen, setMenuOpen] = useState(false);
  const [clock, setClock] = useState("--:--");

  useEffect(() => {
    const interval = setInterval(() => {
      setClock(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <nav
      style={{
        width: "100%",
        height: 52,
        background: "linear-gradient(to bottom, #0078d7, #005fb8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",   // center the inner container
        padding: "0",               // inner container handles spacing now
        color: "white",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 1000
      }}
    >
      {/* INNER WRAPPER: constrain width + horizontal padding */}
      <div className="nav-inner" style={{
        width: "100%",
        maxWidth: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 0px"   // <- adjust this to increase gap from edges
      }}>

        {/* LEFT SECTION */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: 0.5,
              textShadow: "1px 1px 1px rgba(0,0,0,0.4)"
            }}
          >
            Memories
          </span>

          {/* DESKTOP MENU */}
          <div
            className="nav-desktop"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              fontSize: 14,
              fontWeight: 500
            }}
          >
            {items.map((it) => {
              const active = router.pathname === it.href;
              return (
                <Link key={it.href} href={it.href} legacyBehavior>
                  <a
                    style={{
                      cursor: "pointer",
                      textDecoration: active ? "underline" : "none",
                      color: "white",
                      padding: "3px 8px",
                      borderRadius: 3,
                      background: active ? "rgba(255,255,255,0.06)" : "transparent"
                    }}
                  >
                    {it.label}
                  </a>
                </Link>
              );
            })}
          </div>
        </div>

        {/* RIGHT SECTION (Clock + Hamburger) */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, paddingRight: 8 }}>
          <div style={{ color: "white", fontSize: 14, fontWeight: 600 }}>{clock}</div>

          {/* HAMBURGER ICON */}
          <div
            className="hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: 26,
              height: 22,
              display: "none",
              flexDirection: "column",
              justifyContent: "space-between",
              cursor: "pointer"
            }}
          >
            <span style={{ height: 3, background: "white", borderRadius: 4 }}></span>
            <span style={{ height: 3, background: "white", borderRadius: 4 }}></span>
            <span style={{ height: 3, background: "white", borderRadius: 4 }}></span>
          </div>
        </div>

      </div> {/* end nav-inner */}


      {/* MOBILE MENU DROPDOWN */}
      {menuOpen && (
        <div
          className="mobile-menu"
          style={{
            position: "fixed",
            top: 52,
            right: 0,
            width: "60%",
            background: "#005fb8",
            padding: "16px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
          }}
        >
          {items.map((it) => (
            <Link key={it.href} href={it.href} legacyBehavior>
              <a
                style={{
                  padding: "10px 8px",
                  color: "white",
                  borderRadius: 4,
                  background: router.pathname === it.href ? "rgba(255,255,255,0.15)" : "transparent"
                }}
                onClick={() => setMenuOpen(false)}
              >
                {it.label}
              </a>
            </Link>
          ))}
        </div>
      )}

      {/* RESPONSIVE CSS */}
      <style>{`
        @media (max-width: 768px) {
          .nav-desktop {
            display: none !important;
          }
          .hamburger {
            display: flex !important;
          }
        }
        .nav-inner { box-sizing: border-box; }
@media (max-width: 768px) {
  .nav-inner { padding: 0 12px; }
}

      `}</style>
    </nav>
  );
}
