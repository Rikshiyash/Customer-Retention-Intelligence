import re

file_path = r"c:\Users\Arun Panchal\Downloads\ChurnPredictor\frontend\src\Dashboard.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Dark Mode State & Ticker State
state_str = """  const [revLoading, setRevLoading] = useState(true);

  // Dark/Light Mode
  const [theme, setTheme] = useState('dark');
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  // Live Ticker State
  const [tickerItems, setTickerItems] = useState([]);
  
  // Gamification & Campaigns
  const [leaderboard, setLeaderboard] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
"""
content = content.replace("  const [revLoading, setRevLoading] = useState(true);", state_str)

# 2. Effects for Ticker, Gamification, Campaigns
effect_str = """  // Fetch Ticker & Gamification
  useEffect(() => {
    // Mock live alerts for ticker
    fetch(`${API_BASE}/subscribers?risk_tier=High&page_size=5`)
      .then(res => res.json())
      .then(data => {
        if(data.data) {
           setTickerItems(data.data.map(d => `ALERT: ${d.subscriber_id} (${d.region}) shows ${(d.churn_probability*100).toFixed(1)}% churn risk`));
        }
      });
      
    // Fetch leaderboard
    fetch(`${API_BASE}/leaderboard`)
      .then(res => res.json())
      .then(data => setLeaderboard(data))
      .catch(e => console.error(e));
      
    // Fetch campaigns
    fetch(`${API_BASE}/campaigns`)
      .then(res => res.json())
      .then(data => setCampaigns(data))
      .catch(e => console.error(e));
  }, []);

  // Fetch Forecast"""
content = content.replace("  // Fetch Forecast", effect_str)

# 3. Theme application
content = content.replace('<div className="min-h-screen bg-[#0f1117] text-gray-300 font-mono p-6">', 
                          '<div className={`min-h-screen ${theme === "dark" ? "bg-[#0f1117] text-gray-300" : "bg-gray-50 text-gray-800"} font-mono p-6`}>')

# 4. Dark Mode Toggle Button & Ticker UI in Header
header_old = """<header className="flex flex-col gap-4 mb-8 border-b border-gray-800 pb-4">
        <div className="flex items-center justify-between">"""
header_new = """<header className="flex flex-col gap-4 mb-8 border-b border-gray-800 pb-4">
        {/* LIVE CHURN TICKER */}
        {tickerItems.length > 0 && (
          <div className="bg-[#1a0a0a] border border-red-900/50 text-[#f59e0b] px-4 py-2 flex overflow-hidden relative">
            <div className="absolute left-0 bg-gradient-to-r from-[#1a0a0a] to-transparent w-8 h-full z-10" />
            <div className="absolute right-0 bg-gradient-to-l from-[#1a0a0a] to-transparent w-8 h-full z-10" />
            <div className="flex animate-[marquee_20s_linear_infinite] whitespace-nowrap gap-8 hover:[animation-play-state:paused]">
              {tickerItems.map((item, i) => (
                <span key={i} className="font-bold cursor-pointer hover:underline text-sm uppercase">🚨 {item}</span>
              ))}
              {tickerItems.map((item, i) => (
                <span key={i+"dup"} className="font-bold cursor-pointer hover:underline text-sm uppercase">🚨 {item}</span>
              ))}
            </div>
            <style>{`@keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }`}</style>
          </div>
        )}
        <div className="flex items-center justify-between">"""
content = content.replace(header_old, header_new)

header_btn_old = """<div className="flex items-center gap-4">
            <label"""
header_btn_new = """<div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="text-2xl hover:scale-110 transition-transform">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <label"""
content = content.replace(header_btn_old, header_btn_new)

# 5. Gamification & Campaign Manager Panels
panels_ui = """      {/* GAMIFICATION & CAMPAIGN PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className={`border rounded-lg p-6 ${theme === "dark" ? "bg-[#1a1d26] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`}>
          <h2 className={`font-syne text-xl mb-4 border-b pb-2 ${theme === "dark" ? "text-white border-gray-800" : "text-black border-gray-200"}`}>🏆 Top Agents (Gamification)</h2>
          <div className="space-y-3">
            {leaderboard.map((agent, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded border ${theme === "dark" ? (i === 0 ? "bg-[#f59e0b]/10 border-[#f59e0b]/30" : "bg-[#0f1117] border-gray-800") : (i === 0 ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200")}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${i===0 ? "bg-[#f59e0b] text-black" : "bg-gray-700 text-white"}`}>
                    {i === 0 ? '👑' : agent.rank}
                  </div>
                  <span className={`font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{agent.agent_name}</span>
                </div>
                <div className="text-right">
                  <div className="text-green-500 font-bold">₹{(agent.revenue_saved/1000).toFixed(1)}k</div>
                  <div className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>{agent.subscribers_retained} Retained</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`border rounded-lg p-6 ${theme === "dark" ? "bg-[#1a1d26] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`}>
          <h2 className={`font-syne text-xl mb-4 border-b pb-2 ${theme === "dark" ? "text-white border-gray-800" : "text-black border-gray-200"}`}>📢 Campaign Manager</h2>
          <div className="space-y-3">
            {campaigns.map((camp, i) => (
              <div key={i} className={`p-4 rounded border ${theme === "dark" ? "bg-[#0f1117] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className={`font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{camp.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${camp.status === 'Active' ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'}`}>{camp.status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Target: {camp.target_audience}</span>
                  <span className="text-[#f59e0b]">ROI: {camp.roi}</span>
                </div>
              </div>
            ))}
            <button className="w-full mt-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold rounded transition-colors">
              + New Campaign
            </button>
          </div>
        </div>
      </div>

      {/* 3. AT-RISK SUBSCRIBER TABLE */}"""
content = content.replace("      {/* 3. AT-RISK SUBSCRIBER TABLE */}", panels_ui)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Injected all features!")
