interface CryptoIconProps {
  symbol: string;
  className?: string;
}

const COIN_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  BTC: { bg: "#F7931A", fg: "#FFFFFF", label: "₿" },
  ETH: { bg: "#627EEA", fg: "#FFFFFF", label: "Ξ" },
  BNB: { bg: "#F3BA2F", fg: "#1E1E1E", label: "B" },
  SOL: { bg: "#9945FF", fg: "#FFFFFF", label: "S" },
  USDT: { bg: "#26A17B", fg: "#FFFFFF", label: "₮" },
  USDC: { bg: "#2775CA", fg: "#FFFFFF", label: "$" },
  TRON: { bg: "#EF0027", fg: "#FFFFFF", label: "T" },
};

const DEFAULT_STYLE = { bg: "#4B5563", fg: "#FFFFFF", label: "?" };

/** Brand-colored badge for a crypto asset symbol (BTC, ETH, USDT, etc). */
export function CryptoIcon({ symbol, className }: CryptoIconProps) {
  const style = COIN_STYLES[symbol.toUpperCase()] ?? DEFAULT_STYLE;

  return (
    <span
      className={className ?? "h-6 w-6"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "9999px",
        backgroundColor: style.bg,
        color: style.fg,
        fontWeight: 700,
        fontSize: "0.65em",
        lineHeight: 1,
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {style.label}
    </span>
  );
}
