# -*- coding: utf-8 -*-
import re

file_path = r"c:\Users\Arun Panchal\Downloads\ChurnPredictor\frontend\src\Dashboard.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Make sure useRef is imported
if "useRef" not in content:
    content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect, useRef } from 'react';")

chat_assistant_code = """
const ChatAssistant = () => {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: "user", content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversation_history: newHistory.slice(0, -1) })
      });
      const data = await res.json();
      setMessages([...newHistory, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages([...newHistory, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedPrompts = [
    "Which region needs attention this week?",
    "Best offer for Premium subscribers?",
    "Summarize today's churn risk",
    "How many subscribers can we save this month?"
  ];

  if (!expanded) {
    return (
      <button 
        onClick={() => setExpanded(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[var(--accent)] text-black rounded-full shadow-lg flex items-center justify-center hover:bg-[var(--accent-hover)] transition-transform hover:scale-105 z-50 group"
        title="Ask ChurnGuard AI"
      >
        <span className="text-2xl">💬</span>
        <span className="absolute right-16 bg-black text-[var(--accent)] border border-[var(--accent)] px-3 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Ask ChurnGuard AI</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[380px] h-[500px] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden font-mono">
      {/* Header */}
      <div className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] p-4 flex justify-between items-center">
        <h3 className="text-[var(--accent)] font-bold flex items-center gap-2">
          <span>⚡</span> ChurnGuard AI
        </h3>
        <button onClick={() => setExpanded(false)} className="text-[var(--text-secondary)] hover:text-white transition-colors">
          <span className="text-xl">&times;</span>
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-center text-[var(--text-secondary)] mb-6 text-sm">
              I'm connected to your live subscriber data. How can I help you reduce churn today?
            </div>
            <div className="flex flex-col gap-2">
              {suggestedPrompts.map((p, i) => (
                <button 
                  key={i} 
                  onClick={() => handleSend(p)}
                  className="text-xs text-left bg-[var(--bg-primary)] border border-[var(--border-color)] p-2 rounded hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded p-3 text-sm ${m.role === 'user' ? 'bg-[var(--accent)] text-black rounded-br-none' : 'bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-bl-none'}`}>
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded rounded-bl-none p-3 text-sm flex gap-1 items-center">
              <span className="animate-bounce">.</span>
              <span className="animate-bounce" style={{animationDelay: '0.2s'}}>.</span>
              <span className="animate-bounce" style={{animationDelay: '0.4s'}}>.</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-primary)] flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
          placeholder="Ask about churn..." 
          className="flex-1 bg-transparent border border-[var(--border-color)] rounded p-2 text-sm text-white focus:outline-none focus:border-[var(--accent)]"
        />
        <button 
          onClick={() => handleSend(input)}
          disabled={loading || !input.trim()}
          className="bg-[var(--accent)] text-black px-3 rounded font-bold hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
};
"""

content = content.replace("export default function ChurnGuardDashboard() {", chat_assistant_code + "\nexport default function ChurnGuardDashboard() {")

# Inject <ChatAssistant /> right before the final closing div of ChurnGuardDashboard
content = re.sub(r'(\s+)(</div>\s*\)\;\s*\})', r'\1  <ChatAssistant />\n\1\2', content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Dashboard.jsx updated")
