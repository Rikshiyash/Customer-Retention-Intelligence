const API_BASE = 'http://localhost:8000/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Summary {
  total_subscribers: number;
  churn_high_count: number;
  churn_medium_count: number;
  churn_low_count: number;
  avg_churn_probability: number;
  total_arpu_at_risk: number;
}

export interface Subscriber {
  subscriber_id: string;
  region: string;
  package_type: string;
  tenure_months: number;
  arpu: number;
  complaint_count: number;
  days_since_active: number;
  churn_probability: number;
  risk_tier: 'High' | 'Medium' | 'Low';
  churn_reasons: string;
  sentiment?: string;
  recommendation?: string;
}

export interface SubscriberDetail extends Subscriber {
  avg_recharge: number;
  min_recharge: number;
  recharge_trend: number;
  complaint_text?: string;
}

export interface RegionalData {
  region: string;
  avg_churn_prob: number;
  high_risk_count: number;
  total_count: number;
  avg_arpu: number;
}

export interface ForecastResponse {
  without_intervention: Array<{ period: string; churned: number; revenue_lost: number }>;
  with_intervention: Array<{ period: string; churned: number; revenue_lost: number }>;
}

export interface LiveAlert {
  id: string;
  subscriber_id: string;
  region: string;
  risk_tier: 'High' | 'Medium' | 'Low';
  churn_probability: number;
  message: string;
  timestamp: string;
  action: string;
}

export interface ModelMetrics {
  accuracy: number;
  auc_roc: number;
  precision: number;
  recall: number;
  f1_score: number;
}

export interface Campaign {
  id: string;
  name: string;
  risk_tier: string;
  region: string;
  package_type: string;
  status: string;
  subscribers: number;
  contacted: number;
  retained: number;
  churned: number;
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
  read: boolean;
}

export interface SentimentSummary {
  angry_count: number;
  frustrated_count: number;
  neutral_count: number;
  angry_pct: number;
  frustrated_pct: number;
  neutral_pct: number;
  top_angry_subscribers: Array<{ subscriber_id: string; region: string; complaint_text: string }>;
  regional_sentiment: Array<{ region: string; angry: number; frustrated: number; neutral: number }>;
}

export interface ExecutiveSummary {
  subscribers_at_risk: number;
  revenue_at_risk: number;
  predicted_churn_rate_pct: number;
  vs_last_month_pct: number;
  campaigns_active: number;
  estimated_monthly_savings: number;
  top_risk_region: string;
  most_common_churn_reason: string;
  model_confidence: number;
  last_updated: string;
  churn_reasons_breakdown: Record<string, number>;
}

export interface RevenueImpact {
  retention_rate: number;
  subscribers_retained: number;
  revenue_saved: number;
  total_at_risk: number;
}

// ─── API Functions ─────────────────────────────────────────────────────────────

export const api = {
  getSummary: () => apiFetch<Summary>('/summary'),

  getSubscribers: (params?: {
    page?: number;
    page_size?: number;
    region?: string;
    package_type?: string;
    risk_tier?: string;
    search?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.page_size) q.set('page_size', String(params.page_size));
    if (params?.region) q.set('region', params.region);
    if (params?.package_type) q.set('package_type', params.package_type);
    if (params?.risk_tier) q.set('risk_tier', params.risk_tier);
    if (params?.search) q.set('search', params.search);
    return apiFetch<{ subscribers: Subscriber[]; total: number; page: number; page_size: number }>(
      `/subscribers?${q}`
    );
  },

  getSubscriber: (id: string) => apiFetch<SubscriberDetail>(`/subscriber/${id}`),

  getRegional: () => apiFetch<RegionalData[]>('/regional'),

  getForecast: () => apiFetch<ForecastResponse>('/forecast'),

  getLiveAlerts: () => apiFetch<LiveAlert[]>('/live-alerts'),

  getModelMetrics: () => apiFetch<ModelMetrics>('/model-metrics'),

  getNotifications: () => apiFetch<Notification[]>('/notifications'),

  getCampaigns: () => apiFetch<Campaign[]>('/campaigns'),

  getSentimentSummary: () => apiFetch<SentimentSummary>('/sentiment-summary'),

  getExecutiveSummary: () => apiFetch<ExecutiveSummary>('/executive-summary'),

  getRevenueImpact: (retentionRate: number) =>
    apiFetch<RevenueImpact>(`/revenue-impact?retention_rate=${retentionRate}`),

  markContacted: (subscriberId: string, agentName: string, outcome: string) =>
    apiFetch('/mark-contacted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriber_id: subscriberId, agent_name: agentName, outcome }),
    }),

  optimizeOffer: (subscriberId: string) =>
    apiFetch('/optimize-offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriber_id: subscriberId }),
    }),

  chat: (message: string, history: Array<{ role: string; content: string }>) =>
    apiFetch<{ reply: string }>('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversation_history: history }),
    }),
};
