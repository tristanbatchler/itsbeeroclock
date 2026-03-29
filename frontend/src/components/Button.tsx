import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "default",
      size = "default",
      children,
      ...props
    },
    ref,
  ) => {
    const base =
      "inline-flex items-center justify-center rounded-2xl text-sm font-bold transition-all focus-visible:outline-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer";
    const variants = {
      default: "bg-primary text-primary-foreground-foreground hover:bg-primary/90",
      primary: "bg-primary text-primary-foreground-foreground hover:bg-primary/90",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      destructive:
        "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      outline:
        "border-2 border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
      ghost: "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
    };
    const sizes = {
      default: "h-12 px-4 py-2",
      sm: "h-9 rounded-xl px-3",
      lg: "h-16 rounded-2xl px-8 text-lg",
      icon: "h-10 w-10",
    };
    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
