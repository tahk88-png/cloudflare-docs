import React from 'react';

// Mock shadcn/ui components
export const Button = ({ children, className, disabled, onClick, variant = 'primary', size = 'default' }: any) => {
  const base = "inline-flex items-center justify-center rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    destructive: "bg-red-500 text-white hover:bg-red-600",
    outline: "border border-slate-200 bg-white hover:bg-slate-100 text-slate-900",
    ghost: "hover:bg-slate-100 text-slate-900",
    link: "text-slate-900 underline-offset-4 hover:underline"
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded px-3",
    lg: "h-11 rounded px-8",
    icon: "h-10 w-10"
  };

  const variantClass = variants[variant as keyof typeof variants] || variants.primary;
  const sizeClass = sizes[size as keyof typeof sizes] || sizes.default;

  return (
    <button 
      className={`${base} ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export const Card = ({ children, className, onClick }: any) => (
  <div 
    className={`bg-white rounded-lg border border-slate-200 text-slate-950 shadow-sm ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

export const Badge = ({ children, variant = 'default', className }: any) => {
  const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  const variants = {
    default: "border-transparent bg-slate-900 text-slate-50 hover:bg-slate-900/80",
    secondary: "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80",
    destructive: "border-transparent bg-red-500 text-slate-50 hover:bg-red-500/80",
    outline: "text-slate-950 border-slate-200",
    success: "border-transparent bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25",
    warning: "border-transparent bg-amber-500/15 text-amber-700 hover:bg-amber-500/25",
    error: "border-transparent bg-red-500/15 text-red-700 hover:bg-red-500/25"
  };
  
  const variantClass = variants[variant as keyof typeof variants] || variants.default;

  return (
    <span className={`${base} ${variantClass} ${className}`}>
      {children}
    </span>
  );
};

export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-100 ${className}`}
      {...props}
    />
  )
}
