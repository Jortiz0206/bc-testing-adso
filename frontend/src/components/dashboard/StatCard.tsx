import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  variant?: "default" | "primary" | "warning" | "success";
  delay?: number;
}

const variantStyles = {
  default: "bg-card border-border",
  primary: "bg-primary/5 border-primary/20",
  warning: "bg-warning/10 border-warning/20",
  success: "bg-success/10 border-success/20",
};

const iconVariantStyles = {
  default: "bg-secondary text-foreground",
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/15 text-warning",
  success: "bg-success/15 text-success",
};

export const StatCard = ({
  icon: Icon,
  label,
  value,
  change,
  changeType = "neutral",
  variant = "default",
  delay = 0,
}: StatCardProps) => {
  return (
    <div
      className={`group rounded-xl border p-5 animate-fade-in opacity-0 [animation-fill-mode:forwards] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-foreground/5 ${variantStyles[variant]}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold mt-1 text-card-foreground">{value}</p>
          {change && (
            <p
              className={`text-xs mt-1 font-medium ${
                changeType === "positive"
                  ? "text-success"
                  : changeType === "negative"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {change}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${iconVariantStyles[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;