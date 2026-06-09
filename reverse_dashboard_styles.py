import re

file_path = r"frontend\src\Dashboard.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Reverse imports
content = content.replace("import { Trophy, Crown, Megaphone, Map, Target, Activity, Users, DollarSign, BrainCircuit, Bell, LayoutDashboard } from 'lucide-react';\n", "")

# 2. Reverse colors
content = content.replace('bg-card', 'bg-[#1a1d26]')
# We replaced border-gray-800 and border-gray-700 with border-border. We will restore all border-border to border-gray-800 to be safe.
content = content.replace('border-border', 'border-gray-800')
# We replaced text-white and text-black with text-card-foreground. We'll default back to text-white.
content = content.replace('text-card-foreground', 'text-white')

content = content.replace('bg-muted', 'bg-[#13151c]')
content = content.replace('bg-background', 'bg-[#0f1117]')

content = content.replace('text-muted-foreground', 'text-gray-400')

content = content.replace('focus:ring-1 focus:ring-primary focus:border-primary', 'focus:border-[#f59e0b]')
content = content.replace('bg-primary hover:bg-primary/90 text-primary-foreground', 'bg-[#2563EB] hover:bg-[#1d4ed8]')
content = content.replace('bg-primary text-primary-foreground', 'bg-[#f59e0b]')
content = content.replace('text-primary', 'text-[#f59e0b]')
content = content.replace('accent-primary', 'accent-[#f59e0b]')

# 3. Reverse Emojis (with regex just in case spaces shifted)
content = re.sub(r'<div className="flex items-center"><Trophy className="[^"]*" /> Top Agents</div>', r'🏆 Top Agents (Gamification)', content)
content = re.sub(r'<Crown className="[^"]*" />', r'👑', content)
content = re.sub(r'<div className="flex items-center"><Megaphone className="[^"]*" /> Campaign Manager</div>', r'📢 Campaign Manager', content)
content = re.sub(r'<div className="flex items-center"><Map className="[^"]*" /> Churn Risk by Region</div>', r'dY-,? Churn Risk by Region', content)
content = re.sub(r'<div className="flex items-center"><Target className="[^"]*" /> ChurnGuard AI</div>', r'🎯 ChurnGuard AI', content)

# 4. Reverse structural styles
content = content.replace('font-semibold tracking-tight', 'font-syne')
content = content.replace('rounded-xl', 'rounded-lg')
# Note: we also changed some 'rounded' to 'rounded-md', we'll change 'rounded-md' back to 'rounded'
content = content.replace('rounded-md', 'rounded')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Dashboard.jsx reversed successfully!")
