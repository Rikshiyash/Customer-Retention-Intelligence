# -*- coding: utf-8 -*-
file_path = r"c:\Users\Arun Panchal\Downloads\ChurnPredictor\frontend\src\Dashboard.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

import_str = "import { useNavigate, useLocation } from 'react-router-dom';\n"
if "react-router-dom" not in content:
    # Just prepend it after the first line
    lines = content.split("\n")
    lines.insert(1, import_str)
    content = "\n".join(lines)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Added imports to Dashboard")
