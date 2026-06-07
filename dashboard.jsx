import React, { useState, useEffect } from 'react';

// Helper hook for debouncing search and slider inputs
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function ChurnGuardDashboard() {
  // State for Summary
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // State for Subscribers
  const [subscribers, setSubscribers] = useState([]);
  const [subTotal, setSubTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [regionFilter, setRegionFilter] = useState('');
  const [packageFilter, setPackageFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const debouncedSearch = useDebounce(searchFilter, 500);
  const [subsLoading, setSubsLoading] = useState(true);

  // State for Revenue Impact
  const [retentionRate, setRetentionRate] = useState(40);
  const debouncedRetention = useDebounce(retentionRate, 300);
  const [revenueImpact, setRevenueImpact] = useState(null);
  const [revLoading, setRevLoading] = useState(true);

  // State for Model Metrics
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // State for Regional Map
  const [regionalData, setRegionalData] = useState([]);
  const [regionalLoading, setRegionalLoading] = useState(true);
  const [hoveredCity, setHoveredCity] = useState(null);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const API_BASE = 'http://localhost:8000/api';

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.status === 'success') {
        setUploadMessage({ type: 'success', text: `Upload successful! Processed ${data.rows_processed} rows.` });
        setRefreshTrigger(prev => prev + 1);
      } else {
        setUploadMessage({ type: 'error', text: data.message || 'Upload failed' });
      }
    } catch (err) {
      console.error(err);
      setUploadMessage({ type: 'error', text: 'An error occurred during upload' });
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  // Fetch Summary
  useEffect(() => {
    fetch(`${API_BASE}/summary`)
      .then(res => res.json())
      .then(data => {
        setSummary(data);
        setSummaryLoading(false);
      })
      .catch(err => console.error(err));
  }, [refreshTrigger]);

  // Fetch Model Metrics
  useEffect(() => {
    fetch(`${API_BASE}/model-metrics`)
      .then(res => res.json())
      .then(data => {
        setMetrics(data);
        setMetricsLoading(false);
      })
      .catch(err => console.error(err));
  }, [refreshTrigger]);

  // Fetch Regional
  useEffect(() => {
    fetch(`${API_BASE}/regional`)
      .then(res => res.json())
      .then(data => {
        setRegionalData(data);
        setRegionalLoading(false);
      })
      .catch(err => console.error(err));
  }, [refreshTrigger]);

  // Fetch Subscribers
  useEffect(() => {
    setSubsLoading(true);
    const params = new URLSearchParams({ page, page_size: 50 });
    if (regionFilter) params.append('region', regionFilter);
    if (packageFilter) params.append('package_type', packageFilter);
    if (tierFilter) params.append('risk_tier', tierFilter);
    if (debouncedSearch) params.append('search', debouncedSearch);

    fetch(`${API_BASE}/subscribers?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setSubscribers(data.data || []);
        setSubTotal(data.total || 0);
        setSubsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setSubsLoading(false);
      });
  }, [page, regionFilter, packageFilter, tierFilter, debouncedSearch, refreshTrigger]);

  // Fetch Revenue Impact
  useEffect(() => {
    setRevLoading(true);
    fetch(`${API_BASE}/revenue-impact?retention_rate=${debouncedRetention / 100}`)
      .then(res => res.json())
      .then(data => {
        setRevenueImpact(data);
        setRevLoading(false);
      })
      .catch(err => console.error(err));
  }, [debouncedRetention, refreshTrigger]);

  // Handle Export
  const handleExport = async () => {
    const params = new URLSearchParams({ page: 1, page_size: 10000 });
    if (regionFilter) params.append('region', regionFilter);
    if (packageFilter) params.append('package_type', packageFilter);
    if (tierFilter) params.append('risk_tier', tierFilter);
    if (debouncedSearch) params.append('search', debouncedSearch);

    try {
      const res = await fetch(`${API_BASE}/subscribers?${params.toString()}`);
      const data = await res.json();
      
      if (!data.data || data.data.length === 0) {
        alert("No data to export");
        return;
      }

      const keys = Object.keys(data.data[0]);
      const csvContent = [
        keys.join(','),
        ...data.data.map(row => keys.map(k => `"${row[k]}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'at_risk_subscribers.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export data");
    }
  };

  const getTierColor = (tier) => {
    if (tier === 'High') return 'text-red-500 bg-red-500/10 border-red-500/30';
    if (tier === 'Medium') return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    return 'text-green-500 bg-green-500/10 border-green-500/30';
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-300 font-mono p-6">
      {/* Import Fonts */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Syne:wght@600;700;800&display=swap');
        .font-syne { font-family: 'Syne', sans-serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }
        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #0f1117; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #4b5563; }
      `}} />

      {/* 1. HEADER */}
      <header className="flex flex-col gap-4 mb-8 border-b border-gray-800 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-syne font-bold text-white flex items-center gap-3">
              <span className="text-[#f59e0b]">⚡</span> ChurnGuard
            </h1>
            <p className="text-gray-500 mt-1 uppercase tracking-wider text-sm">DTH Subscriber Intelligence</p>
          </div>
          <div className="flex items-center gap-4">
            <label className={`flex items-center gap-2 px-4 py-2 rounded transition-colors cursor-pointer border ${isUploading ? 'bg-gray-800 border-gray-700 text-gray-500' : 'bg-[#1a1d26] border-gray-700 text-gray-300 hover:border-[#f59e0b] hover:text-[#f59e0b]'}`}>
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                onChange={handleUpload}
                disabled={isUploading}
              />
              {isUploading ? '⏳ Uploading...' : '📤 Upload Subscriber Data'}
            </label>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30 hover:bg-[#f59e0b]/20 px-4 py-2 rounded transition-colors"
            >
              📥 Download At-Risk List
            </button>
          </div>
        </div>
        {uploadMessage && (
          <div className={`p-3 rounded text-sm ${uploadMessage.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}>
            {uploadMessage.text}
          </div>
        )}
      </header>

      {/* 2. SUMMARY CARDS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total Subscribers", value: summaryLoading ? "..." : summary?.total_subscribers?.toLocaleString(), icon: "👥" },
          { label: "High Risk", value: summaryLoading ? "..." : summary?.churn_high_count?.toLocaleString(), color: "text-red-500", icon: "🔴" },
          { label: "Medium Risk", value: summaryLoading ? "..." : summary?.churn_medium_count?.toLocaleString(), color: "text-yellow-500", icon: "🟡" },
          { label: "Revenue at Risk", value: summaryLoading ? "..." : formatCurrency(summary?.total_arpu_at_risk || 0), icon: "💸" },
        ].map((stat, i) => (
          <div key={i} className="bg-[#1a1d26] border border-gray-800 rounded-lg p-5 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm uppercase tracking-wider">{stat.label}</span>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <span className={`text-3xl font-syne font-bold ${stat.color || 'text-white'}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* REGIONAL HEATMAP */}
      <div className="bg-[#1a1d26] border border-gray-800 rounded-lg p-6 mb-8 relative">
        <h2 className="font-syne text-xl text-white mb-4 border-b border-gray-800 pb-2">🗺️ Churn Risk by Region</h2>
        {regionalLoading ? (
          <div className="animate-pulse flex items-center justify-center h-[600px]">
            <span className="text-[#f59e0b]">Loading map data...</span>
          </div>
        ) : (
          <div className="relative w-full overflow-x-auto flex justify-center items-center">
            <svg width="500" height="600" viewBox="0 0 500 600" className="block">
              {/* Schematic India Outline */}
              <polygon 
                points="210,60 250,60 300,120 380,200 350,260 240,500 200,500 130,300 100,230 160,160" 
                fill="none" 
                stroke="#374151" 
                strokeWidth="2" 
                strokeDasharray="6,6" 
              />
              {regionalData.map((data) => {
                const coords = {
                  Delhi: {x: 240, y: 140},
                  Mumbai: {x: 160, y: 290},
                  Bangalore: {x: 200, y: 420},
                  Chennai: {x: 240, y: 430},
                  Kolkata: {x: 340, y: 230},
                  Hyderabad: {x: 220, y: 360},
                  Pune: {x: 170, y: 305},
                  Ahmedabad: {x: 140, y: 230},
                  Jaipur: {x: 210, y: 175},
                  Lucknow: {x: 275, y: 185}
                }[data.region] || {x: 250, y: 300};
                
                const maxTotal = Math.max(...regionalData.map(d => d.total), 1);
                const r = 12 + ((data.total / maxTotal) * 16);
                
                let fill = '#22c55e'; // green
                if (data.avg_churn_prob > 0.65) fill = '#ef4444'; // red
                else if (data.avg_churn_prob >= 0.35) fill = '#f59e0b'; // amber
                
                return (
                  <g 
                    key={data.region}
                    onMouseEnter={() => setHoveredCity({...data, ...coords})}
                    onMouseLeave={() => setHoveredCity(null)}
                    className="cursor-pointer transition-transform duration-200 hover:scale-110 origin-center"
                    style={{ transformOrigin: `${coords.x}px ${coords.y}px` }}
                  >
                    <circle cx={coords.x} cy={coords.y} r={r} fill={fill} opacity="0.8" stroke="#1a1d26" strokeWidth="3" />
                    <text 
                      x={coords.x} 
                      y={coords.y + r + 14} 
                      textAnchor="middle" 
                      fill="#9ca3af" 
                      className="font-mono text-[10px]"
                    >
                      {data.region}
                    </text>
                  </g>
                );
              })}
            </svg>
            
            {/* Tooltip */}
            {hoveredCity && (
              <div 
                className="absolute bg-[#0f1117] border border-gray-700 p-3 rounded shadow-xl pointer-events-none z-10"
                style={{ 
                  left: `calc(50% - 250px + ${hoveredCity.x + 20}px)`, 
                  top: `${hoveredCity.y - 40}px` 
                }}
              >
                <div className="font-syne font-bold text-white mb-2 border-b border-gray-800 pb-1">{hoveredCity.region}</div>
                <div className="text-xs space-y-1 font-mono text-gray-300">
                  <div className="flex justify-between gap-4"><span>Total:</span> <span className="text-white">{hoveredCity.total}</span></div>
                  <div className="flex justify-between gap-4"><span>High Risk:</span> <span className="text-red-500">{hoveredCity.high_risk}</span></div>
                  <div className="flex justify-between gap-4"><span>Medium Risk:</span> <span className="text-yellow-500">{hoveredCity.medium_risk}</span></div>
                  <div className="flex justify-between gap-4"><span>Low Risk:</span> <span className="text-green-500">{hoveredCity.low_risk}</span></div>
                  <div className="flex justify-between gap-4 mt-2 pt-2 border-t border-gray-800">
                    <span>Avg Churn:</span> 
                    <span className="text-white">{(hoveredCity.avg_churn_prob * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 4. REVENUE IMPACT CALCULATOR */}
        <div className="bg-[#1a1d26] border border-gray-800 rounded-lg p-6 lg:col-span-1 flex flex-col">
          <h2 className="font-syne text-xl text-white mb-4 border-b border-gray-800 pb-2">Revenue Impact Calculator</h2>
          
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Target Retention Rate</span>
              <span className="text-[#f59e0b] font-bold">{retentionRate}%</span>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={retentionRate} 
              onChange={(e) => setRetentionRate(parseInt(e.target.value))}
              className="w-full accent-[#f59e0b] h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {revLoading ? (
            <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-[#f59e0b]">Calculating...</div></div>
          ) : (
            <div className="flex-1 flex flex-col justify-center bg-[#0f1117] p-4 rounded border border-gray-800">
              <p className="text-gray-400 leading-relaxed mb-4">
                Retaining <strong className="text-white">{retentionRate}%</strong> of High-Risk subscribers saves:
              </p>
              <div className="text-3xl font-syne text-[#22c55e] mb-2 font-bold">
                {formatCurrency(revenueImpact?.revenue_saved || 0)}
              </div>
              <p className="text-sm text-gray-500">
                ({revenueImpact?.retained_subscribers?.toLocaleString()} retained this month)
              </p>
            </div>
          )}
        </div>

        {/* 5. MODEL PERFORMANCE PANEL */}
        <div className="bg-[#1a1d26] border border-gray-800 rounded-lg p-6 lg:col-span-2">
          <h2 className="font-syne text-xl text-white mb-4 border-b border-gray-800 pb-2">Model Performance</h2>
          
          {metricsLoading ? (
            <div className="animate-pulse flex space-x-4">
              <div className="h-4 bg-gray-700 rounded w-1/4"></div>
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-8">
              {/* Badges */}
              <div className="grid grid-cols-2 gap-4 md:w-1/3">
                {[
                  { l: 'Accuracy', v: `${(metrics.accuracy * 100).toFixed(1)}%` },
                  { l: 'Precision', v: `${(metrics.precision * 100).toFixed(1)}%` },
                  { l: 'Recall', v: `${(metrics.recall * 100).toFixed(1)}%` },
                  { l: 'AUC-ROC', v: metrics.auc_roc.toFixed(3) }
                ].map(m => (
                  <div key={m.l} className="bg-[#0f1117] border border-gray-800 p-3 rounded text-center">
                    <div className="text-xs text-gray-500 uppercase mb-1">{m.l}</div>
                    <div className="text-lg text-white font-bold">{m.v}</div>
                  </div>
                ))}
              </div>

              {/* Feature Importances Bar Chart */}
              <div className="md:w-2/3">
                <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-3">Feature Drivers</h3>
                <div className="space-y-3">
                  {metrics.feature_importances.slice(0, 5).map(f => {
                    const maxImp = Math.max(...metrics.feature_importances.map(m => m.importance));
                    const widthPct = (f.importance / maxImp) * 100;
                    return (
                      <div key={f.feature} className="flex items-center text-sm">
                        <div className="w-1/3 truncate pr-4 text-gray-300">{f.feature}</div>
                        <div className="w-2/3 h-2 bg-gray-800 rounded-full overflow-hidden relative">
                          <div 
                            className="absolute top-0 left-0 h-full bg-[#f59e0b] rounded-full"
                            style={{ width: `${widthPct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. AT-RISK SUBSCRIBER TABLE */}
      <div className="bg-[#1a1d26] border border-gray-800 rounded-lg flex flex-col flex-1 overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-gray-800 flex flex-wrap gap-4 items-center bg-[#13151c]">
          <input 
            type="text" 
            placeholder="Search Subscriber ID..." 
            value={searchFilter}
            onChange={(e) => { setSearchFilter(e.target.value); setPage(1); }}
            className="bg-[#0f1117] border border-gray-700 text-white px-3 py-2 rounded outline-none focus:border-[#f59e0b] text-sm flex-1 min-w-[200px]"
          />
          <select 
            value={riskFilter => setTierFilter(e.target.value)}
            onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
            className="bg-[#0f1117] border border-gray-700 text-white px-3 py-2 rounded outline-none focus:border-[#f59e0b] text-sm"
          >
            <option value="">All Risks</option>
            <option value="High">High Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="Low">Low Risk</option>
          </select>
          <select 
            value={regionFilter}
            onChange={(e) => { setRegionFilter(e.target.value); setPage(1); }}
            className="bg-[#0f1117] border border-gray-700 text-white px-3 py-2 rounded outline-none focus:border-[#f59e0b] text-sm"
          >
            <option value="">All Regions</option>
            {/* Hardcoded based on data gen script, or could fetch from /api/regional */}
            {['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select 
            value={packageFilter}
            onChange={(e) => { setPackageFilter(e.target.value); setPage(1); }}
            className="bg-[#0f1117] border border-gray-700 text-white px-3 py-2 rounded outline-none focus:border-[#f59e0b] text-sm"
          >
            <option value="">All Packages</option>
            <option value="Basic">Basic</option>
            <option value="Standard">Standard</option>
            <option value="Premium">Premium</option>
          </select>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-[#0f1117] border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Rank</th>
                <th className="p-4 font-medium">Subscriber ID</th>
                <th className="p-4 font-medium">Region / Package</th>
                <th className="p-4 font-medium">Risk Tier</th>
                <th className="p-4 font-medium">Churn Prob.</th>
                <th className="p-4 font-medium">Key Drivers</th>
                <th className="p-4 font-medium">Recommended Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {subsLoading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">
                    <div className="animate-pulse inline-flex items-center gap-2">
                      <span className="text-[#f59e0b]">⚡</span> Fetching data...
                    </div>
                  </td>
                </tr>
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">No subscribers found matching filters.</td>
                </tr>
              ) : (
                subscribers.map((sub, idx) => (
                  <tr key={sub.subscriber_id} className="hover:bg-gray-800/20 transition-colors group">
                    <td className="p-4 text-gray-500 text-sm">#{(page - 1) * 50 + idx + 1}</td>
                    <td className="p-4 font-medium text-white">{sub.subscriber_id}</td>
                    <td className="p-4 text-sm">
                      <div className="text-gray-300">{sub.region}</div>
                      <div className="text-gray-500 text-xs">{sub.package_type}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getTierColor(sub.risk_tier)}`}>
                        {sub.risk_tier}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="text-sm w-12 text-right">{(sub.churn_probability * 100).toFixed(1)}%</div>
                        <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${sub.churn_probability > 0.65 ? 'bg-red-500' : sub.churn_probability > 0.35 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${sub.churn_probability * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-gray-400 max-w-[200px] truncate" title={sub.churn_reasons}>
                      {sub.churn_reasons?.split(', ').map((reason, i) => (
                        <span key={i} className="inline-block bg-gray-800 text-gray-300 px-2 py-0.5 rounded mr-1 mb-1 border border-gray-700">
                          {reason}
                        </span>
                      ))}
                    </td>
                    <td className="p-4 text-sm text-[#f59e0b] max-w-[200px] truncate" title={sub.recommended_action}>
                      {sub.recommended_action}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between bg-[#13151c]">
          <div className="text-sm text-gray-500">
            Showing <span className="text-white">{(page - 1) * 50 + 1}</span> to <span className="text-white">{Math.min(page * 50, subTotal)}</span> of <span className="text-white">{subTotal}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 bg-[#0f1117] border border-gray-700 rounded text-sm disabled:opacity-50 hover:bg-gray-800 transition-colors"
            >
              Prev
            </button>
            <button 
              disabled={page * 50 >= subTotal}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 bg-[#0f1117] border border-gray-700 rounded text-sm disabled:opacity-50 hover:bg-gray-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
