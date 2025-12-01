import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, TrendingUp, MousePointer, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type AnalyticsOverviewProps = {
  totalViews: number;
  totalViewsThisWeek: number;
  averageConversion: number;
  clickThroughRate: number;
  viewsData: Array<{ date: string; views: number }>;
};

export const AnalyticsOverview = ({
  totalViews,
  totalViewsThisWeek,
  averageConversion,
  clickThroughRate,
  viewsData,
}: AnalyticsOverviewProps) => {
  const stats = [
    {
      title: "Total Views",
      value: totalViews.toLocaleString(),
      icon: Eye,
      description: "All-time product views",
      trend: `+${totalViewsThisWeek} this week`,
    },
    {
      title: "Avg. Conversion",
      value: `${averageConversion.toFixed(1)}%`,
      icon: TrendingUp,
      description: "Views to sales ratio",
    },
    {
      title: "Click Rate",
      value: `${clickThroughRate.toFixed(1)}%`,
      icon: MousePointer,
      description: "Engagement metric",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <Card key={idx} className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
              {stat.trend && (
                <p className="text-xs text-success font-medium mt-2">{stat.trend}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Views Chart */}
      <Card className="shadow-[var(--shadow-card-hover)]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Views Over Time (Last 30 Days)</CardTitle>
          </div>
          <p className="text-muted-foreground text-sm">Track your products' visibility</p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={viewsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="views" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
