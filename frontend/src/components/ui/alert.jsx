import React from "react";

export const Alert = React.forwardRef(({ className = "", variant = "default", ...props }, ref) => {
  const base = "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-slate-950";
  const styles = variant === "destructive" 
    ? "border-red-500/50 text-red-600 dark:border-red-500 [&>svg]:text-red-600 bg-red-50/20" 
    : "bg-white text-slate-950 border-slate-200";

  return (
    <div
      ref={ref}
      role="alert"
      className={`${base} ${styles} ${className}`}
      {...props}
    />
  );
});
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef(({ className = "", ...props }, ref) => (
  <h5
    ref={ref}
    className={`mb-1 font-medium leading-none tracking-tight ${className}`}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`text-sm [&_p]:leading-relaxed ${className}`}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";
