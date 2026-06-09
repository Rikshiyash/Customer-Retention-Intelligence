# -*- coding: utf-8 -*-
file_path = r"c:\Users\Arun Panchal\Downloads\ChurnPredictor\frontend\src\ExecutiveSummaryPage.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = "{(summaryData.risk_tiers[tier] || 0).toLocaleString()}"
replacement = "{(summaryData[`churn_${tier.toLowerCase()}_count`] || 0).toLocaleString()}"

content = content.replace(target, replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed summaryData access in ExecutiveSummaryPage.jsx")
