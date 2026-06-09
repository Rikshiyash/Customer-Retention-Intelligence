import re

with open(r'C:\Users\Arun Panchal\Downloads\ChurnPredictor\frontend\src\Dashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace state
old_state = '''  // Deep Dive Modal
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);'''

new_state = '''  // Deep Dive Modal
  const [selectedSubscriberId, setSelectedSubscriberId] = useState(null);
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [trackerStatus, setTrackerStatus] = useState('Pending');

  useEffect(() => {
    if (selectedSubscriberId) {
      setModalLoading(true);
      fetch(`http://localhost:8000/api/subscriber/${selectedSubscriberId}`)
        .then(res => res.json())
        .then(data => {
           setSelectedSubscriber(data);
           const storedStatuses = JSON.parse(localStorage.getItem('churnguard_statuses') || '{}');
           setTrackerStatus(storedStatuses[selectedSubscriberId] || 'Pending');
           setModalLoading(false);
        })
        .catch(err => {
           console.error(err);
           setModalLoading(false);
        });
    } else {
      setSelectedSubscriber(null);
    }
  }, [selectedSubscriberId]);'''

content = content.replace(old_state, new_state)

# 2. Replace onClick in table
old_tr = '''<tr key={sub.subscriber_id} className={`hover:bg-gray-800/20 transition-colors group cursor-pointer ${theme === "dark" ? "hover:bg-gray-800/50" : "hover:bg-gray-100"}`} onClick={() => setSelectedSubscriber(sub)}>'''
new_tr = '''<tr key={sub.subscriber_id} className={`hover:bg-gray-800/20 transition-colors group cursor-pointer ${theme === "dark" ? "hover:bg-gray-800/50" : "hover:bg-gray-100"}`} onClick={() => setSelectedSubscriberId(sub.subscriber_id)}>'''
content = content.replace(old_tr, new_tr)

# 3. Add helper functions
old_funcs = '''  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  return ('''

new_funcs = '''  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  const renderRiskGauge = (prob) => {
    const radius = 60;
    const circumference = Math.PI * radius;
    const strokeDashoffset = circumference - (prob * circumference);
    const color = prob > 0.65 ? '#ef4444' : prob > 0.35 ? '#f59e0b' : '#22c55e';
    
    return (
      <div className="flex flex-col items-center justify-center relative w-32 h-20 overflow-hidden">
        <svg viewBox="0 0 140 80" className="w-full h-full transform translate-y-2">
          <path d="M 10 70 A 60 60 0 0 1 130 70" fill="none" stroke="#374151" strokeWidth="12" strokeLinecap="round" />
          <path 
            d="M 10 70 A 60 60 0 0 1 130 70" 
            fill="none" 
            stroke={color} 
            strokeWidth="12" 
            strokeLinecap="round" 
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset} 
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute bottom-0 text-2xl font-bold font-syne" style={{color}}>{(prob * 100).toFixed(0)}%</div>
      </div>
    );
  };

  const renderRechargeChart = (historyStr) => {
    if (!historyStr) return null;
    const vals = historyStr.split(',').map(Number);
    if (vals.length === 0) return null;
    
    const max = Math.max(...vals, 1);
    const min = Math.min(...vals, 0);
    const range = max - min || 1;
    
    const width = 300;
    const height = 100;
    const padding = 20;
    
    const points = vals.map((v, i) => {
      const x = padding + (i / (vals.length - 1)) * (width - padding * 2);
      const y = height - padding - ((v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="w-full flex flex-col items-center">
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          <polyline points={points} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {vals.map((v, i) => {
             const x = padding + (i / (vals.length - 1)) * (width - padding * 2);
             const y = height - padding - ((v - min) / range) * (height - padding * 2);
             return (
               <g key={i}>
                 <circle cx={x} cy={y} r="4" fill="#0f1117" stroke="#2563EB" strokeWidth="2" />
                 <text x={x} y={y - 10} fontSize="10" fill="#9ca3af" textAnchor="middle">₹{v}</text>
               </g>
             );
          })}
        </svg>
        <div className="flex justify-between w-full text-xs text-gray-500 mt-2 px-4">
           <span>T-6 Mo</span>
           <span>Current</span>
        </div>
      </div>
    );
  };

  const cycleStatus = () => {
     const statuses = ['Pending', 'Contacted', 'Offer Accepted', 'Churned'];
     const idx = statuses.indexOf(trackerStatus);
     const next = statuses[(idx + 1) % statuses.length];
     setTrackerStatus(next);
     
     const stored = JSON.parse(localStorage.getItem('churnguard_statuses') || '{}');
     stored[selectedSubscriberId] = next;
     localStorage.setItem('churnguard_statuses', JSON.stringify(stored));
  };

  return ('''
content = content.replace(old_funcs, new_funcs)

# 4. Replace Modal Block
import re
pattern = re.compile(r'\{\/\* 4\. DEEP DIVE MODAL \*\/\}.*?    </div>\n  \);\n\}', re.DOTALL)

new_modal = '''{/* 4. DEEP DIVE MODAL */}
      {selectedSubscriberId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={() => setSelectedSubscriberId(null)}>
          <div 
            className={`w-full max-w-3xl rounded-xl p-6 relative border shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${theme === "dark" ? "bg-[#0f1117] border-gray-800" : "bg-white border-gray-200"}`}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setSelectedSubscriberId(null)} className={`absolute top-4 right-4 text-2xl hover:scale-110 transition-transform ${theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}>
              ✕
            </button>
            
            {modalLoading || !selectedSubscriber ? (
              <div className="flex flex-col items-center justify-center h-64">
                 <div className="animate-spin text-[#f59e0b] text-4xl mb-4">↻</div>
                 <div className="text-gray-400 font-mono">Loading Full Profile...</div>
              </div>
            ) : (
              <>
                {/* MODAL HEADER */}
                <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#f59e0b] p-1">
                      <div className={`w-full h-full rounded-full flex items-center justify-center text-xl font-bold ${theme === "dark" ? "bg-[#1a1d26] text-white" : "bg-white text-black"}`}>
                        {selectedSubscriber.subscriber_id.substring(0,2)}
                      </div>
                    </div>
                    <div>
                      <h2 className={`font-syne text-3xl font-bold ${theme === "dark" ? "text-white" : "text-black"}`}>{selectedSubscriber.subscriber_id}</h2>
                      <div className="flex gap-2 mt-1">
                         <span className="bg-[#2563EB]/20 text-[#2563EB] border border-[#2563EB]/30 px-2 py-0.5 rounded text-xs font-bold">{selectedSubscriber.region}</span>
                         <span className="bg-purple-500/20 text-purple-500 border border-purple-500/30 px-2 py-0.5 rounded text-xs font-bold">{selectedSubscriber.package_type}</span>
                         <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getTierColor(selectedSubscriber.risk_tier)}`}>{selectedSubscriber.risk_tier} Risk</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    {renderRiskGauge(selectedSubscriber.churn_probability)}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* LEFT COLUMN: History & Timeline */}
                  <div className="flex flex-col gap-6">
                    <div className={`p-4 rounded border ${theme === "dark" ? "bg-[#1a1d26] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                      <div className="text-gray-500 text-xs uppercase mb-4">Recharge History (Last 6 Months)</div>
                      {renderRechargeChart(selectedSubscriber.recharge_history)}
                    </div>
                    
                    <div className={`p-4 rounded border ${theme === "dark" ? "bg-[#1a1d26] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                      <div className="text-gray-500 text-xs uppercase mb-4">Behaviour Timeline</div>
                      <div className="relative border-l-2 border-gray-700 ml-3 space-y-4 pl-4 py-2 text-sm">
                         <div className="relative">
                            <div className="absolute -left-[23px] top-1 w-3 h-3 bg-[#2563EB] rounded-full"></div>
                            <div className={theme === "dark" ? "text-gray-300" : "text-gray-800"}>Joined <strong className="text-white">{selectedSubscriber.tenure_months} months</strong> ago</div>
                         </div>
                         <div className="relative">
                            <div className="absolute -left-[23px] top-1 w-3 h-3 bg-[#2563EB] rounded-full"></div>
                            <div className={theme === "dark" ? "text-gray-300" : "text-gray-800"}>Last active: <strong className="text-white">{selectedSubscriber.days_since_active} days</strong> ago</div>
                         </div>
                         <div className="relative">
                            <div className="absolute -left-[23px] top-1 w-3 h-3 bg-red-500 rounded-full"></div>
                            <div className={theme === "dark" ? "text-gray-300" : "text-gray-800"}>Filed <strong className="text-white">{selectedSubscriber.complaint_count} complaints</strong></div>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Reasons & Actions */}
                  <div className="flex flex-col gap-6">
                    <div className={`p-4 rounded border ${theme === "dark" ? "bg-[#1a1d26] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                      <div className="text-gray-500 text-xs uppercase mb-3">Top Churn Drivers</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedSubscriber.churn_reasons?.split(', ').map((reason, i) => (
                          <span key={i} className="flex items-center gap-1 bg-gray-800 text-gray-300 px-3 py-1.5 rounded-full border border-gray-700 text-sm">
                            <span className="text-red-400">⚠️</span> {reason}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className={`p-5 rounded border flex-1 flex flex-col ${theme === "dark" ? "bg-[#1a0a0a] border-red-900/30" : "bg-red-50 border-red-200"}`}>
                       <h3 className="text-red-500 font-bold mb-3 flex items-center gap-2"><span>🎯</span> Recommended Action</h3>
                       <div className={`font-medium mb-6 ${theme === "dark" ? "text-gray-300" : "text-gray-800"}`}>{selectedSubscriber.recommended_action}</div>
                       
                       <div className="mt-auto flex flex-col gap-3">
                         <div className="flex items-center justify-between p-3 bg-black/20 rounded border border-gray-800">
                           <span className="text-sm text-gray-400">Current Status:</span>
                           <span className={`px-2 py-1 rounded text-xs font-bold ${
                             trackerStatus === 'Pending' ? 'bg-gray-500/20 text-gray-400' :
                             trackerStatus === 'Contacted' ? 'bg-blue-500/20 text-blue-400' :
                             trackerStatus === 'Offer Accepted' ? 'bg-green-500/20 text-green-400' :
                             'bg-red-500/20 text-red-400'
                           }`}>{trackerStatus}</span>
                         </div>
                         <button 
                           onClick={cycleStatus} 
                           className="w-full py-3 bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold rounded shadow-lg transition-transform hover:scale-[1.02]"
                         >
                           {trackerStatus === 'Pending' ? 'Mark as Contacted' : 'Update Status'}
                         </button>
                       </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
'''
content = pattern.sub(new_modal, content)

with open(r'C:\Users\Arun Panchal\Downloads\ChurnPredictor\frontend\src\Dashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated successfully")
