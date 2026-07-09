"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { COUNTRIES, flagEmoji } from "@/lib/countries";

interface CountrySelectProps {
  label?: string;
  value: string;
  onChange: (code: string) => void;
  error?: string;
}

export function CountrySelect({ label, value, onChange, error }: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => COUNTRIES.find((c) => c.code === value), [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && <label className="text-sm font-medium text-text-secondary">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white/[0.03] px-3.5 py-2.5 text-sm text-left text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 ${
            error ? "border-danger" : "border-white/10"
          }`}
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <span className="text-base leading-none">{flagEmoji(selected.code)}</span>
              <span className="truncate">{selected.name}</span>
            </span>
          ) : (
            <span className="text-text-muted">Select your country</span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" />
        </button>

        {isOpen && (
          <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-white/10 bg-background-card shadow-card">
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-text-muted" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search countries..."
                className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              />
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3.5 py-2.5 text-sm text-text-muted">No countries found.</p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      onChange(c.code);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm hover:bg-white/[0.05] ${
                      c.code === value ? "text-gold" : "text-text-primary"
                    }`}
                  >
                    <span className="text-base leading-none">{flagEmoji(c.code)}</span>
                    <span className="truncate">{c.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
