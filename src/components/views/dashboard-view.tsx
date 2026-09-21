"use client";

import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  HandCoins,
} from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useAppStore } from "@/lib/store";

function formatCurrency(amount: number) {
  return `$${Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const chartConfig = {
  income: {
    label: "Income",
    color: "oklch(0.7 0.17 162)",
  },
  expenses: {
    label: "Expenses",
    color: "oklch(0.6 0.2 25)",
  },
} satisfies ChartConfig;

export function DashboardView() {
  const { summary, isLoading } = useAppStore();

  const summaryCards = [
    {
      title: "Active Balance",
      value: summary?.activeBalance ?? 0,
      icon: DollarSign,
      colorClass: "text-emerald-600",
      bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
      iconBgClass: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600",
    },
    {
      title: "Total Income",
      value: summary?.totalIncome ?? 0,
      icon: TrendingUp,
      colorClass: "text-green-600",
      bgClass: "bg-green-50 dark:bg-green-950/30",
      iconBgClass: "bg-green-100 dark:bg-green-900/50 text-green-600",
    },
    {
      title: "Total Expenses",
      value: summary?.totalExpenses ?? 0,
      icon: TrendingDown,
      colorClass: "text-red-600",
      bgClass: "bg-red-50 dark:bg-red-950/30",
      iconBgClass: "bg-red-100 dark:bg-red-900/50 text-red-600",
    },
    {
      title: "Total Debt",
      value: summary?.totalDebt ?? 0,
      icon: CircleDollarSign,
      colorClass: "text-orange-600",
      bgClass: "bg-orange-50 dark:bg-orange-950/30",
      iconBgClass: "bg-orange-100 dark:bg-orange-900/50 text-orange-600",
    },
    {
      title: "Total Receivable",
      value: summary?.totalReceivable ?? 0,
      icon: HandCoins,
      colorClass: "text-teal-600",
      bgClass: "bg-teal-50 dark:bg-teal-950/30",
      iconBgClass: "bg-teal-100 dark:bg-teal-900/50 text-teal-600",
    },
  ];

  const monthlyData = summary?.monthlyData ?? [];

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your financial status
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <Card key={card.title} className={`${card.bgClass} border-0`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-sm font-medium">
                {card.title}
              </CardDescription>
              <div
                className={`flex size-8 items-center justify-center rounded-md ${card.iconBgClass}`}
              >
                <card.icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.colorClass}`}>
                {formatCurrency(card.value)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Cash Flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Cash Flow</CardTitle>
          <CardDescription>
            Income vs Expenses over the last 12 months
          </CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyData.length > 0 ? (
            <ChartContainer
              config={chartConfig}
              className="min-h-[300px] w-full aspect-auto"
            >
              <BarChart
                data={monthlyData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) =>
                    `$${(value as number).toLocaleString()}`
                  }
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        `$${Number(value).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      }
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="income"
                  fill="var(--color-income)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  fill="var(--color-expenses)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No data available. Add transactions to see your cash flow.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
