# -*- coding: utf-8 -*-

file_path = r"c:\Users\Arun Panchal\Downloads\ChurnPredictor\frontend\src\Dashboard.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

state_inj = """
  const [execSummary, setExecSummary] = useState(null);
  
  useEffect(() => {
    fetch(`${API_BASE}/executive-summary`)
      .then(res => res.json())
      .then(data => setExecSummary(data))
      .catch(err => console.error(err));
  }, []);

  const handleExportExecReport = () => {
    if (!execSummary) return;
    const txt = `EXECUTIVE SUMMARY REPORT
Generated on: ${execSummary.last_updated}

--- KPI OVERVIEW ---
Subscribers at Risk:       ${execSummary.subscribers_at_risk}
Revenue at Risk:           ₹${(execSummary.revenue_at_risk/100000).toFixed(2)}L
Predicted Churn Rate:      ${execSummary.predicted_churn_rate_pct}%
Vs Last Month:             ${execSummary.vs_last_month_pct}%

--- INSIGHTS ---
Active Campaigns:          ${execSummary.campaigns_active}
Est. Monthly Savings:      ₹${(execSummary.estimated_monthly_savings/100000).toFixed(2)}L
Top Risk Region:           ${execSummary.top_risk_region}
Most Common Reason:        ${execSummary.most_common_churn_reason}
Model Confidence:          ${execSummary.model_confidence}%
`;
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'executive_summary.txt';
    a.click();
    URL.revokeObjectURL(url);
  };
"""

content = content.replace("const [sentimentSummary, setSentimentSummary] = useState(null);", "const [sentimentSummary, setSentimentSummary] = useState(null);\n" + state_inj)

panel_inj = """
        {/* EXECUTIVE SUMMARY PANEL */}
        {execSummary && (
          <div className="bg-[#1e293b] border-t-4 border-[var(--accent)] rounded-lg shadow-lg mb-8 overflow-hidden">
            <div className="p-6">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Column */}
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
                    <h2 className="text-2xl font-bold text-white tracking-wide" style={{ fontFamily: "'Syne', sans-serif" }}>
                      📊 Executive Summary
                    </h2>
                    <span className="text-xs font-mono text-gray-400">Last updated: {execSummary.last_updated}</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-gray-800/50 p-3 rounded">
                      <span className="text-gray-300">Subscribers at Risk</span>
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-bold text-white">{execSummary.subscribers_at_risk.toLocaleString()}</span>
                        <span className={`text-sm font-bold ${execSummary.vs_last_month_pct > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {execSummary.vs_last_month_pct > 0 ? '↑' : '↓'} {Math.abs(execSummary.vs_last_month_pct)}% vs last month
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center bg-gray-800/50 p-3 rounded">
                      <span className="text-gray-300">Revenue at Risk</span>
                      <span className="text-xl font-bold text-white">₹{(execSummary.revenue_at_risk / 100000).toFixed(2)}L</span>
                    </div>

                    <div className="flex justify-between items-center bg-gray-800/50 p-3 rounded">
                      <span className="text-gray-300">Predicted Churn Rate</span>
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-bold text-white">{execSummary.predicted_churn_rate_pct}%</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-gray-800/50 p-3 rounded">
                      <span className="text-gray-300">Est. Savings if Acting</span>
                      <span className="text-xl font-bold text-green-400">₹{(execSummary.estimated_monthly_savings / 100000).toFixed(2)}L</span>
                    </div>

                    <div className="flex justify-between items-center bg-gray-800/50 p-3 rounded">
                      <span className="text-gray-300">Model Confidence</span>
                      <span className="text-xl font-bold text-[var(--accent)]">{execSummary.model_confidence}%</span>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-gray-400 bg-gray-800/30 p-3 rounded border border-gray-700">
                    ⚠️ <strong className="text-white">Focus Area:</strong> {execSummary.top_risk_region} · <strong className="text-white">Most common reason:</strong> {execSummary.most_common_churn_reason}
                  </div>
                </div>

                {/* Right Column */}
                <div className="lg:w-1/3 flex flex-col justify-center items-center bg-gray-800/80 p-8 rounded-lg border border-gray-700 text-center">
                  <h3 className="text-xl text-gray-300 mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>Action Required</h3>
                  <div className="text-4xl font-bold text-white mb-2">
                    {execSummary.subscribers_at_risk.toLocaleString()}
                  </div>
                  <div className="text-gray-400 mb-8">subscribers need attention across {execSummary.campaigns_active} active campaigns</div>
                  
                  <button 
                    onClick={() => document.getElementById("at-risk-table")?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full bg-[var(--accent)] hover:bg-amber-600 text-black font-bold py-3 px-6 rounded shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all transform hover:scale-105 mb-4"
                  >
                    View At-Risk List →
                  </button>

                  <button 
                    onClick={handleExportExecReport}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded border border-gray-600 transition-colors mb-4 flex items-center justify-center gap-2"
                  >
                    📄 Export Executive Report
                  </button>
                  
                  <div className="text-xs text-gray-400 mt-auto">
                    💡 Acting on 40% of high-risk subscribers saves ₹{(execSummary.estimated_monthly_savings/100000).toFixed(2)}L this month
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
"""

target_str = "{/* 2. SUMMARY CARDS ROW */}"
if target_str in content:
    content = content.replace(target_str, panel_inj + "\n\n      " + target_str)

# Add id="at-risk-table" to the AT-RISK SUBSCRIBER TABLE wrapper
table_target = '        {/* 3. AT-RISK SUBSCRIBER TABLE */}\n        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg flex flex-col flex-1 \noverflow-hidden">'
table_inj = '        {/* 3. AT-RISK SUBSCRIBER TABLE */}\n        <div id="at-risk-table" className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg flex flex-col flex-1 \noverflow-hidden">'
content = content.replace(table_target, table_inj)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Injected Exec Panel successfully!")
