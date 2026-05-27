import React from "react";

export function Badge({ className = "", variant = "default", ...props }) {
  const base = "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none";
  
  const variants = {
    default: "border-transparent bg-slate-900 text-white shadow hover:bg-slate-900/80",
    secondary: "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80",
    destructive: "border-transparent bg-red-500 text-white shadow hover:bg-red-500/80",
    outline: "text-slate-950 border-slate-200"
  };

  const selectedVariant = variants[variant] || variants.default;

  return (
    <div className={`${base} ${selectedVariant} ${className}`} {...props} />
  );
}
