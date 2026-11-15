import type { ElementType, ReactNode } from "react";

type CardProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
};

export function Card({ as: Component = "div", children, className = "" }: CardProps) {
  return (
    <Component className={`rounded-3xl border border-border bg-sage-soft/40 ${className}`}>
      {children}
    </Component>
  );
}
