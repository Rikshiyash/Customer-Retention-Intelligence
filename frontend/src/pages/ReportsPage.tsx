import { EmptyState } from '../components/ui/LoadingState';
import { BarChart3 } from 'lucide-react';

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Executive Reports</h1>
        <p className="page-subtitle">Comprehensive analytics and exportable reports.</p>
      </div>
      <EmptyState 
        title="Reporting Dashboard Coming Soon"
        description="The advanced analytics builder and PDF export system is being implemented."
        icon={BarChart3}
      />
    </div>
  );
}
