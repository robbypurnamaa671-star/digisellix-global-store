import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

export const EscrowStatusBadge = ({ status }: { status?: string | null }) => {
  switch (status) {
    case "held":
      return (
        <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          <Shield className="h-3 w-3 mr-1" /> Held in escrow
        </Badge>
      );
    case "released":
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          <ShieldCheck className="h-3 w-3 mr-1" /> Released
        </Badge>
      );
    case "disputed":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
          <ShieldAlert className="h-3 w-3 mr-1" /> Disputed
        </Badge>
      );
    case "refunded":
      return (
        <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
          <ShieldX className="h-3 w-3 mr-1" /> Refunded
        </Badge>
      );
    default:
      return null;
  }
};
