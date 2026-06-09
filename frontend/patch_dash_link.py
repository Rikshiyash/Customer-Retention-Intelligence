# -*- coding: utf-8 -*-
import re

file_path = r"c:\Users\Arun Panchal\Downloads\ChurnPredictor\frontend\src\Dashboard.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add imports
if "import { useNavigate, useLocation } from 'react-router-dom';" not in content:
    content = content.replace("import React, { useState, useEffect, useMemo, useRef } from 'react';", "import React, { useState, useEffect, useMemo, useRef } from 'react';\nimport { useNavigate, useLocation } from 'react-router-dom';")

# Add hooks inside Dashboard component
hook_injection = """export default function ChurnGuardDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.hash === '#at-risk-table') {
      const el = document.getElementById('at-risk-table');
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 300);
      }
    }
  }, [location]);
"""
content = content.replace("export default function ChurnGuardDashboard() {", hook_injection)

# Find and remove the block
start_marker = "{/* EXECUTIVE SUMMARY PANEL */}"
end_marker = "{/* 2. SUMMARY CARDS ROW */}"
if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    cta_link = """
        {/* LINK TO EXECUTIVE SUMMARY */}
        <div className="mb-8 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded p-4 flex justify-between items-center">
          <div>
            <h3 className="text-white font-bold">Want the high-level view?</h3>
            <p className="text-gray-400 text-sm">See predicted churn rate, revenue at risk, and actionable insights.</p>
          </div>
          <button 
            onClick={() => navigate('/executive')}
            className="bg-[var(--accent)] hover:bg-amber-600 text-black font-bold py-2 px-4 rounded shadow-[0_0_10px_rgba(245,158,11,0.3)] transition-colors"
          >
            📈 View Executive Summary
          </button>
        </div>
        
        """
    content = content[:start_idx] + cta_link + content[end_idx:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated Dashboard.jsx")
