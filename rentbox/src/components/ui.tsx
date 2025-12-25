import React from 'react';

// Mock shadcn/ui components
export const Button = ({ children, className, disabled, onClick, variant = 'primary' }: any) => {
  const base = "px-4 py-2 rounded font-medium transition-colors";
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    destructive: "bg-red-100 text-red-700 hover:bg-red-200",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50"
  };
  return (
    <button 
      className={`${base} ${styles[variant as keyof typeof styles]} ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export const Card = ({ children, className }: any) => (
  <div className={`bg-white rounded-lg shadow border border-gray-100 ${className}`}>
    {children}
  </div>
);

export const Badge = ({ children, variant = 'default' }: any) => {
  const styles = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800"
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${styles[variant as keyof typeof styles]}`}>
      {children}
    </span>
  );
};
