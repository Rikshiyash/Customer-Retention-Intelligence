import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingDown, RefreshCcw, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { api, Summary, ForecastResponse, RegionalData, LiveAlert, ExecutiveSummary } from '../api/client';
import { MetricCard } from '../components/ui/MetricCard';
import { ChartContainer } from '../components/ui/ChartContainer';
import { InsightCard } from '../components/ui/InsightCard';
import { RiskBadge } from '../components/ui/RiskBadge';
import { LoadingState } from '../components/ui/LoadingState';

const COLORS = { High: '#EF4444', Medium: '#F59E0B', Low: '#22C55E' };

export function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [exec, setExec] = useState<ExecutiveSummary | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [regional, setRegional] = useState<RegionalData[]>([]);
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);

  useEffect(() => {
    Promise.all([
      api.getSummary(),
      api.getExecutiveSummary(),
      api.getForecast(),
      api.getRegional(),
      api.getLiveAlerts()
    ]).then(([sum, ex, fcast, reg, alts]) => {
      setSummary(sum);
      setExec(ex);
      setForecast(fcast);
      setRegional(reg.slice(0, 5));
      setAlerts(alts.slice(0, 5));
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading || !summary || !exec) {
    return <LoadingState text="Loading dashboard data..." />;
  }

  const pieData = [
    { name: 'High Risk', value: summary.churn_high_count },
    { name: 'Medium Risk', value: summary.churn_medium_count },
    { name: 'Low Risk', value: summary.churn_low_count }
  ];

  const chartData = forecast ? forecast.without_intervention.map((w, i) => {
    const withInt = forecast.with_intervention[i];
    return {
      month: w.period,
      without_intervention: w.churned,
      with_intervention: withInt.churned
    };
  }) : [];

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title">Command Center</h1>
          <p className="page-subtitle">Overview of your subscriber base and churn risk metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#64748B]">Last updated: {exec.last_updated}</span>
          <button className="btn-primary flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" /> Sync Data
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Customers" 
          value={summary.total_subscribers} 
          trend={2.4} 
          icon={Users} 
        />
        <MetricCard 
          title="At-Risk Customers" 
          value={exec.subscribers_at_risk} 
          trend={exec.vs_last_month_pct} 
          icon={AlertCircle} 
          inverseTrend
        />
        <MetricCard 
          title="Predicted Churn Rate" 
          value={exec.predicted_churn_rate_pct} 
          trend={-1.2} 
          icon={TrendingDown} 
          format="percent"
          inverseTrend
        />
        <MetricCard 
          title="Revenue at Risk" 
          value={exec.revenue_at_risk} 
          trend={4.1} 
          icon={TrendingDown} 
          format="currency"
          inverseTrend
        />
      </div>

      {/* Main Charts & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartContainer title="Churn Forecast (6 Months)" subtitle="Projected at-risk vs retained customers">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRetained" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dx={-10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="with_intervention" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorRetained)" name="With Intervention" />
                <Area type="monotone" dataKey="without_intervention" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorRisk)" name="Without Intervention" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="flex flex-col gap-6">
          <InsightCard 
            title="Critical Insight"
            description={`${exec.top_risk_region} shows the highest volume of high-risk customers, primarily driven by: ${exec.most_common_churn_reason}.`}
            severity="High"
            actionText="View Regional Report"
            onAction={() => navigate('/reports')}
          />
          <ChartContainer title="Risk Distribution">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill={COLORS.High} />
                  <Cell fill={COLORS.Medium} />
                  <Cell fill={COLORS.Low} />
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-xs text-[#64748B]">High</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div><span className="text-xs text-[#64748B]">Medium</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-xs text-[#64748B]">Low</span></div>
            </div>
          </ChartContainer>
        </div>
      </div>

      {/* Recent Alerts Table */}
      <div className="card">
        <div className="p-5 border-b border-[#E2E8F0] flex justify-between items-center">
          <h3 className="font-semibold text-[#0F172A]">Recent Priority Alerts</h3>
          <button 
            onClick={() => navigate('/notifications')}
            className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 transition-colors"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-5 py-3 font-medium text-[#64748B]">Subscriber ID</th>
                <th className="px-5 py-3 font-medium text-[#64748B]">Region</th>
                <th className="px-5 py-3 font-medium text-[#64748B]">Alert Trigger</th>
                <th className="px-5 py-3 font-medium text-[#64748B]">Risk Level</th>
                <th className="px-5 py-3 font-medium text-[#64748B] text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <motion.tr 
                  key={alert.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="table-row"
                >
                  <td className="px-5 py-3.5 font-medium text-[#0F172A]">{alert.subscriber_id}</td>
                  <td className="px-5 py-3.5 text-[#64748B]">{alert.region}</td>
                  <td className="px-5 py-3.5 text-[#0F172A]">{alert.message}</td>
                  <td className="px-5 py-3.5">
                    <RiskBadge level={alert.risk_tier} />
                  </td>
                  <td className="px-5 py-3.5 text-[#64748B] text-right text-xs">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
