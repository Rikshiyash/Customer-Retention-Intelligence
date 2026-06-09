import re

file_path = r"c:\Users\Arun Panchal\Downloads\ChurnPredictor\frontend\src\Dashboard.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add Deep Dive State
state_str = """  const [campaigns, setCampaigns] = useState([]);

  // Deep Dive Modal
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
"""
content = content.replace("  const [campaigns, setCampaigns] = useState([]);\n", state_str)

# Modify Table Row to trigger Deep Dive
table_row_old = """                  <tr key={sub.subscriber_id} className="hover:bg-gray-800/20 transition-colors group">"""
table_row_new = """                  <tr key={sub.subscriber_id} className={`hover:bg-gray-800/20 transition-colors group cursor-pointer ${theme === "dark" ? "hover:bg-gray-800/50" : "hover:bg-gray-100"}`} onClick={() => setSelectedSubscriber(sub)}>"""
content = content.replace(table_row_old, table_row_new)

# Add Modal Component at the very bottom
modal_ui = """
      {/* 4. DEEP DIVE MODAL */}
      {selectedSubscriber && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-2xl rounded-xl p-6 relative border shadow-2xl ${theme === "dark" ? "bg-[#0f1117] border-gray-800" : "bg-white border-gray-200"}`}>
            <button onClick={() => setSelectedSubscriber(null)} className={`absolute top-4 right-4 text-2xl hover:scale-110 transition-transform ${theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"}`}>
              ✕
            </button>
            <div className="flex items-center gap-4 mb-6 border-b border-gray-800 pb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#f59e0b] p-1">
                <div className={`w-full h-full rounded-full flex items-center justify-center text-xl font-bold ${theme === "dark" ? "bg-[#1a1d26] text-white" : "bg-white text-black"}`}>
                  {selectedSubscriber.subscriber_id.substring(0,2)}
                </div>
              </div>
              <div>
                <h2 className={`font-syne text-3xl font-bold ${theme === "dark" ? "text-white" : "text-black"}`}>{selectedSubscriber.subscriber_id}</h2>
                <div className="text-[#f59e0b] font-medium tracking-wide">{(selectedSubscriber.churn_probability * 100).toFixed(1)}% Churn Risk</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
               <div className={`p-4 rounded border ${theme === "dark" ? "bg-[#1a1d26] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                 <div className="text-gray-500 text-xs uppercase">Region / Package</div>
                 <div className={`font-bold text-lg ${theme === "dark" ? "text-white" : "text-black"}`}>{selectedSubscriber.region} • {selectedSubscriber.package_type}</div>
               </div>
               <div className={`p-4 rounded border ${theme === "dark" ? "bg-[#1a1d26] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                 <div className="text-gray-500 text-xs uppercase">Key Drivers</div>
                 <div className="font-bold text-red-500 mt-1">{selectedSubscriber.churn_reasons}</div>
               </div>
            </div>

            <div className={`p-4 rounded border mb-6 ${theme === "dark" ? "bg-[#1a0a0a] border-red-900/30" : "bg-red-50 border-red-200"}`}>
               <h3 className="text-red-500 font-bold mb-2">Recommended Retention Strategy</h3>
               <div className={`font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-800"}`}>{selectedSubscriber.recommended_action}</div>
            </div>

            <div className="flex justify-end gap-4">
               <button onClick={() => setSelectedSubscriber(null)} className={`px-4 py-2 rounded font-medium ${theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-black"}`}>Cancel</button>
               <button onClick={() => setSelectedSubscriber(null)} className="px-6 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold rounded shadow-lg shadow-blue-500/20 transition-all hover:scale-105">
                 Execute Retention Campaign
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}"""
content = content.replace("    </div>\n  );\n}", modal_ui)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Injected Deep Dive Modal!")
