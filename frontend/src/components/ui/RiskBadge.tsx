import { cn } from '../../lib/utils';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface RiskBadgeProps {
  level: 'High' | 'Medium' | 'Low';
  className?: string;
  showIcon?: boolean;
}

export function RiskBadge({ level, className, showIcon = true }: RiskBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
      level === 'High' && "bg-red-50 text-red-700 border border-red-200",
      level === 'Medium' && "bg-amber-50 text-amber-700 border border-amber-200",
      level === 'Low' && "bg-green-50 text-green-700 border border-green-200",
      className
    )}>
      {showIcon && (
        <>
          {level === 'High' && <AlertCircle className="w-3.5 h-3.5" />}
          {level === 'Medium' && <AlertTriangle className="w-3.5 h-3.5" />}
          {level === 'Low' && <CheckCircle2 className="w-3.5 h-3.5" />}
        </>
      )}
      {level} Risk
    </span>
  );
}

