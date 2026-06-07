import { ReactNode } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn, formatNumber, formatCurrency } from '../../lib/utils';

interface MetricCardProps {
  title: string;
  value: number;
  trend: number; // Percentage change
  icon: LucideIcon;
  format?: 'number' | 'currency' | 'percent';
  sparklineData?: number[];
  inverseTrend?: boolean; // If true, positive trend is bad (red) and negative is good (green)
}

export function MetricCard({
  title,
  value,
  trend,
  icon: Icon,
  format = 'number',
  sparklineData = [],
  inverseTrend = false,
}: MetricCardProps) {
  const isPositive = trend > 0;
  const isGood = inverseTrend ? !isPositive : isPositive;

  const displayValue = 
    format === 'currency' ? formatCurrency(value) :
    format === 'percent' ? `${value.toFixed(1)}%` :
    formatNumber(value);

  const chartData = sparklineData.map((val, i) => ({ value: val, index: i }));

  return (
    <div className="card p-5 group hover:shadow-card-hover transition-shadow duration-200 relative overflow-hidden flex flex-col h-[140px]">
      <div className="flex justify-between items-start mb-2 relative z-10">
        <h3 className="text-sm font-medium text-[#64748B]">{title}</h3>
        <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] flex items-center justify-center border border-[#E2E8F0]">
          <Icon className="w-4 h-4 text-[#0F172A]" />
        </div>
      </div>
      
      <div className="flex items-baseline gap-3 relative z-10">
        <div className="text-2xl font-bold text-[#0F172A] tracking-tight">{displayValue}</div>
        <div className={cn(
          "flex items-center text-xs font-medium",
          isGood ? "text-green-600" : "text-red-600"
        )}>
          {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-16 opacity-40 group-hover:opacity-100 transition-opacity duration-300">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`color-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isGood ? "#22C55E" : "#EF4444"} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={isGood ? "#22C55E" : "#EF4444"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={isGood ? "#22C55E" : "#EF4444"} 
                fillOpacity={1} 
                fill={`url(#color-${title})`} 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

