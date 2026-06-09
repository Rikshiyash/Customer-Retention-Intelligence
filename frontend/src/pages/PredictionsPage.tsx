import { EmptyState } from '../components/ui/LoadingState';
import { Brain } from 'lucide-react';

export function PredictionsPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Predictions Engine</h1>
        <p className="page-subtitle">Run ad-hoc ML predictions for hypothetical customer profiles.</p>
      </div>
      <EmptyState 
        title="Prediction Interface Coming Soon"
        description="The form builder for ad-hoc ML model inference is currently under construction."
        icon={Brain}
      />
    </div>
  );
}
