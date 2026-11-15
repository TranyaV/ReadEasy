import type { ElementType, ReactNode } from "react";

type CardProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
};

export function Card({ as: Component = "div", children, className = "" }: CardProps) {
  return (
    <Component className={`rounded-2xl border border-border bg-surface ${className}`}>
      {children}
    </Component>
  );
}
