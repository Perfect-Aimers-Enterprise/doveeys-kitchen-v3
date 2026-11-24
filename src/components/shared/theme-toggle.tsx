"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.dataset.theme === "dark"), []);
  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("dk-theme", next); } catch {}
    setDark(!dark);
  }
  return (
    <button onClick={toggle} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="grid size-10 place-items-center rounded-md border border-border text-text-2 transition-colors hover:text-text">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
