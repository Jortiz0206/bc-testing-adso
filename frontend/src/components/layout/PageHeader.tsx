import { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

const PageHeader = ({ eyebrow, title, description, actions }: PageHeaderProps) => (
  <header className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
    <div className="min-w-0">
      {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>}
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
  </header>
);

export default PageHeader;
