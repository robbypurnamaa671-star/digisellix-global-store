import { Badge } from "@/components/ui/badge";
import { User, Store } from "lucide-react";

interface FeePayerBadgeProps {
  feePayer: "buyer" | "seller";
  showIcon?: boolean;
}

export const FeePayerBadge = ({ feePayer, showIcon = true }: FeePayerBadgeProps) => {
  const isBuyer = feePayer === "buyer";
  const Icon = isBuyer ? User : Store;

  return (
    <Badge 
      variant="outline" 
      className={isBuyer 
        ? "bg-purple-500/10 text-purple-600 border-purple-500/20" 
        : "bg-cyan-500/10 text-cyan-600 border-cyan-500/20"
      }
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {isBuyer ? "Buyer pays fee" : "Seller pays fee"}
    </Badge>
  );
};
