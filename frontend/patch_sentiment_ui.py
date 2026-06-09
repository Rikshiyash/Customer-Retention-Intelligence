# -*- coding: utf-8 -*-
import re

file_path = r"c:\Users\Arun Panchal\Downloads\ChurnPredictor\frontend\src\Dashboard.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. State and pill
state_inj = """
  const [sentimentSummary, setSentimentSummary] = useState(null);
  
  useEffect(() => {
    fetch(`${API_BASE}/sentiment-summary`)
      .then(res => res.json())
      .then(data => setSentimentSummary(data))
      .catch(err => console.error(err));
  }, []);

  const SentimentPill = ({ sentiment }) => {
    if (!sentiment) return null;
    if (sentiment === 'Angry') return <span className="bg-red-500/20 text-red-500 px-2 py-1 rounded text-xs">🔴 Angry</span>;
    if (sentiment === 'Frustrated') return <span className="bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded text-xs">🟡 Frustrated</span>;
    if (sentiment === 'Neutral') return <span className="bg-green-500/20 text-green-500 px-2 py-1 rounded text-xs">🟢 Neutral</span>;
    return <span className="text-gray-500 px-2 py-1 text-xs">{sentiment}</span>;
  };
"""
content = content.replace("const [subscribers, setSubscribers] = useState([]);", "const [subscribers, setSubscribers] = useState([]);\n" + state_inj)

# 2. Main table header
header_target = '<th className="p-4 font-medium">Recommended Action</th>'
header_inj = header_target + '\n                  <th className="p-4 font-medium">Sentiment</th>'
content = content.replace(header_target, header_inj)

# 3. Main table cell
# It renders data using: <td className="p-4 text-xs max-w-xs truncate" title={sub.recommended_action}>{sub.recommended_action}</td>
cell_target = '<td className="p-4 text-xs max-w-xs truncate" title={sub.recommended_action}>{sub.recommended_action}</td>'
cell_inj = cell_target + '\n                      <td className="p-4 whitespace-nowrap"><SentimentPill sentiment={sub.sentiment} /></td>'
content = content.replace(cell_target, cell_inj)

# Also need to fix colSpan for the loading/empty states in that table: colSpan="7" -> colSpan="8"
content = content.replace('colSpan="7"', 'colSpan="8"')

# 4. Dashboard Panel
panel_inj = """
          {/* Complaint Sentiment Analysis */}
          {sentimentSummary && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">😤 Complaint Sentiment Analysis</h2>
              
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-[var(--bg-secondary)] border border-red-500/30 rounded p-4 flex flex-col justify-center items-center">
                  <div className="text-3xl mb-1">🔴</div>
                  <div className="text-xl font-bold text-red-500">{sentimentSummary.angry_count}</div>
                  <div className="text-xs text-[var(--text-secondary)] uppercase">Angry ({sentimentSummary.angry_pct.toFixed(1)}%)</div>
                </div>
                <div className="bg-[var(--bg-secondary)] border border-yellow-500/30 rounded p-4 flex flex-col justify-center items-center">
                  <div className="text-3xl mb-1">🟡</div>
                  <div className="text-xl font-bold text-yellow-500">{sentimentSummary.frustrated_count}</div>
                  <div className="text-xs text-[var(--text-secondary)] uppercase">Frustrated ({sentimentSummary.frustrated_pct.toFixed(1)}%)</div>
                </div>
                <div className="bg-[var(--bg-secondary)] border border-green-500/30 rounded p-4 flex flex-col justify-center items-center">
                  <div className="text-3xl mb-1">🟢</div>
                  <div className="text-xl font-bold text-green-500">{sentimentSummary.neutral_count}</div>
                  <div className="text-xs text-[var(--text-secondary)] uppercase">Neutral ({sentimentSummary.neutral_pct.toFixed(1)}%)</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Sentiment by Region Table */}
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded p-4">
                  <h3 className="text-sm text-[var(--text-secondary)] uppercase tracking-wider mb-4">Sentiment by Region</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)]">
                          <th className="py-2 px-3 font-medium">Region</th>
                          <th className="py-2 px-3 font-medium">Angry</th>
                          <th className="py-2 px-3 font-medium">Frustrated</th>
                          <th className="py-2 px-3 font-medium">Neutral</th>
                          <th className="py-2 px-3 font-medium">Dominant</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/50">
                        {sentimentSummary.sentiment_by_region.map((reg, i) => {
                          let dominant = "Neutral";
                          if (reg.angry >= reg.frustrated && reg.angry >= reg.neutral) dominant = "Angry";
                          else if (reg.frustrated > reg.angry && reg.frustrated > reg.neutral) dominant = "Frustrated";
                          return (
                            <tr key={i}>
                              <td className="py-2 px-3 text-white">{reg.region}</td>
                              <td className="py-2 px-3 text-red-400">{reg.angry}</td>
                              <td className="py-2 px-3 text-yellow-400">{reg.frustrated}</td>
                              <td className="py-2 px-3 text-green-400">{reg.neutral}</td>
                              <td className="py-2 px-3"><SentimentPill sentiment={dominant} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Angry Subscribers */}
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded p-4">
                  <h3 className="text-sm text-[var(--text-secondary)] uppercase tracking-wider mb-4">Top Angry Subscribers</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)]">
                          <th className="py-2 px-3 font-medium">ID</th>
                          <th className="py-2 px-3 font-medium">Region</th>
                          <th className="py-2 px-3 font-medium">Complaints</th>
                          <th className="py-2 px-3 font-medium">Last Text</th>
                          <th className="py-2 px-3 font-medium">Sentiment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/50">
                        {sentimentSummary.top_angry_subscribers.map((sub, i) => (
                          <tr 
                            key={i} 
                            onClick={() => setSelectedSubscriber(sub.subscriber_id)}
                            className="cursor-pointer hover:bg-gray-800/30 transition-colors border-l-2 border-l-red-500"
                          >
                            <td className="py-3 px-3 text-[var(--accent)]">{sub.subscriber_id}</td>
                            <td className="py-3 px-3 text-[var(--text-primary)]">{sub.region}</td>
                            <td className="py-3 px-3 text-center">{sub.complaint_count}</td>
                            <td className="py-3 px-3 text-xs text-[var(--text-secondary)] max-w-[150px] truncate" title={sub.complaint_text}>{sub.complaint_text}</td>
                            <td className="py-3 px-3"><SentimentPill sentiment="Angry" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
"""
# Insert before "At-Risk Subscribers List"
target = '<div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded p-4">'
content = content.replace(target, panel_inj + "\n          " + target, 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Dashboard updated")
