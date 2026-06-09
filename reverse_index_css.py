import re

file_path = r"frontend\src\index.css"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# The @theme block and @layer base we added
content = re.sub(r'@theme \{.*?\n\}', '', content, flags=re.DOTALL)
content = re.sub(r'@layer base \{.*?\n\}', '', content, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("index.css reversed successfully!")
