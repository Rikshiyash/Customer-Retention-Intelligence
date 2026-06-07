import re
file_path = r"c:\Users\Arun Panchal\Downloads\ChurnPredictor\frontend\src\Dashboard.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace z-50 with z-[9999] in ChatAssistant
content = content.replace("z-50 group", "z-[9999] group")
content = content.replace("z-50 overflow-hidden", "z-[9999] overflow-hidden")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed z-index in Dashboard.jsx")
