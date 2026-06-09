import { ReactNode } from 'react';
import { Download } from 'lucide-react';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onExport?: () => void;
}

export function ChartContainer({ title, subtitle, children, onExport }: ChartContainerProps) {
  return (
    <div className="card p-6 flex flex-col h-full min-h-[350px]">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-base font-semibold text-[#0F172A]">{title}</h3>
          {subtitle && <p className="text-sm text-[#64748B] mt-1">{subtitle}</p>}
        </div>
        {onExport && (
          <button 
            onClick={onExport}
            className="p-2 hover:bg-[#F8FAFC] rounded-lg text-[#64748B] transition-colors border border-transparent hover:border-[#E2E8F0]"
            title="Export Data"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex-1 w-full relative">
        {children}
      </div>
    </div>
  );
}
