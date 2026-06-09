# -*- coding: utf-8 -*-
import re

file_path = r"c:\Users\Arun Panchal\Downloads\ChurnPredictor\app.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# I will replace the end of the `get_executive_summary` function:
target = """        "most_common_churn_reason": most_common_churn_reason,
        "model_confidence": round(model_confidence, 1),
        "last_updated": last_updated
    }"""

replacement = """        "most_common_churn_reason": most_common_churn_reason,
        "model_confidence": round(model_confidence, 1),
        "last_updated": last_updated,
        "churn_reasons_breakdown": df['churn_reasons'].value_counts().head(5).to_dict() if 'churn_reasons' in df.columns else {}
    }"""

content = content.replace(target, replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated app.py")
