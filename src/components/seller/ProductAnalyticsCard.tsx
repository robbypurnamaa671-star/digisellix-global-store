import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, ShoppingBag, TrendingUp, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ProductStats = {
  id: string;
  title: string;
  views: number;
  sales: number;
  conversion_rate: number;
  recent_views_7d: number;
};

type ProductAnalyticsCardProps = {
  product: ProductStats;
  onClick: () => void;
};

export const ProductAnalyticsCard = ({ product, onClick }: ProductAnalyticsCardProps) => {
  return (
    <Card 
      className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 cursor-pointer group"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
          {product.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Eye className="h-4 w-4" />
              <span>Views</span>
            </div>
            <div className="text-2xl font-bold">{product.views.toLocaleString()}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <ShoppingBag className="h-4 w-4" />
              <span>Sales</span>
            </div>
            <div className="text-2xl font-bold text-primary">{product.sales}</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-sm text-muted-foreground">Conversion</span>
          </div>
          <Badge variant="secondary">
            {product.conversion_rate.toFixed(1)}%
          </Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Last 7 days</span>
          </div>
          <span className="font-medium">
            {product.recent_views_7d} views
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
