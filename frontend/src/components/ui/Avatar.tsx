import clsx from "clsx";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-20 w-20 text-2xl" };

  return (
    <div
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full bg-primary-muted font-semibold text-primary",
        sizeClasses[size]
      )}
    >
      {initials(name || "?")}
    </div>
  );
}
