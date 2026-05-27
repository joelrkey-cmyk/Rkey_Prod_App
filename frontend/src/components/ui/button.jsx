import React from "react";

export const Button = React.forwardRef(({ className = "", variant = "default", size = "default", ...props }, ref) => {
  const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none";
  
  const variants = {
    default: "bg-slate-900 text-white shadow hover:bg-slate-900/90",
    destructive: "bg-red-500 text-white shadow-sm hover:bg-red-500/90",
    outline: "border border-slate-200 bg-white shadow-sm hover:bg-slate-100/80 hover:text-slate-900",
    secondary: "bg-slate-100 text-slate-900 shadow-sm hover:bg-slate-100/80",
    ghost: "hover:bg-slate-100 hover:text-slate-900",
    link: "text-slate-900 underline-offset-4 hover:underline"
  };

  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9"
  };

  const selectedVariant = variants[variant] || variants.default;
  const selectedSize = sizes[size] || sizes.default;

  return (
    <button
      className={`${baseStyles} ${selectedVariant} ${selectedSize} ${className}`}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = "Button";
