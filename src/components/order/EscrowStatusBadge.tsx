import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";

interface EscrowStatusBadgeProps {
  status: "held" | "released" | "disputed" | "refunded";
  showIcon?: boolean;
}

const statusConfig = {
  held: {
    label: "Escrow Held",
    variant: "default" as const,
    icon: Shield,
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20",
  },
  released: {
    label: "Released",
    variant: "default" as const,
    icon: CheckCircle,
    className: "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20",
  },
  disputed: {
    label: "In Dispute",
    variant: "default" as const,
    icon: AlertTriangle,
    className: "bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20",
  },
  refunded: {
    label: "Refunded",
    variant: "default" as const,
    icon: RefreshCw,
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20",
  },
};

export const EscrowStatusBadge = ({ status, showIcon = true }: EscrowStatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.held;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.className}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
};
