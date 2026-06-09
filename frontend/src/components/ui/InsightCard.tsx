import { Sparkles, ArrowRight } from 'lucide-react';

interface InsightCardProps {
  title: string;
  description: string;
  severity?: 'High' | 'Medium' | 'Low';
  actionText?: string;
  onAction?: () => void;
}

export function InsightCard({ title, description, severity = 'Medium', actionText, onAction }: InsightCardProps) {
  return (
    <div className="bg-gradient-to-br from-[#EFF6FF] to-[#F8FAFC] border border-[#BFDBFE] rounded-xl p-5 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Sparkles className="w-16 h-16 text-[#2563EB]" />
      </div>
      
      <div className="flex items-center gap-2 mb-3 relative z-10">
        <div className="w-6 h-6 rounded-full bg-[#DBEAFE] flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
        </div>
        <h4 className="text-sm font-semibold text-[#1E3A8A]">{title}</h4>
      </div>
      
      <p className="text-sm text-[#3B82F6] mb-4 relative z-10 leading-relaxed">
        {description}
      </p>

      {actionText && onAction && (
        <button 
          onClick={onAction}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors relative z-10"
        >
          {actionText}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
