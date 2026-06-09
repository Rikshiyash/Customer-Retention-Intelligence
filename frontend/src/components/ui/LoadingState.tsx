import { Loader2 } from 'lucide-react';

export function LoadingState({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
      <span className="text-sm text-[#64748B] font-medium animate-pulse">{text}</span>
    </div>
  );
}

export function EmptyState({ title, description, icon: Icon }: { title: string, description: string, icon?: any }) {
  return (
    <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[#E2E8F0] rounded-xl bg-[#F8FAFC]">
      {Icon && (
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
          <Icon className="w-6 h-6 text-[#94A3B8]" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-[#0F172A] mb-1">{title}</h3>
      <p className="text-xs text-[#64748B] max-w-sm">{description}</p>
    </div>
  );
}
