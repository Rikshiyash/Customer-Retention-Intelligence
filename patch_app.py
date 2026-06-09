import re

file_path = r"c:\Users\Arun Panchal\Downloads\ChurnPredictor\app.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add imports
imports = """
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
if os.environ.get("GEMINI_API_KEY"):
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
"""
content = content.replace("from pydantic import BaseModel", "from pydantic import BaseModel\n" + imports)

# Add Pydantic model
models = """
class ChatRequest(BaseModel):
    message: str
    conversation_history: list
"""
content = content.replace("class ContactRequest(BaseModel):", models + "\nclass ContactRequest(BaseModel):")

# Add endpoint at the bottom
endpoint = """
@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    global df
    if df is None or df.empty:
        return {"reply": "Sorry, data is not loaded yet."}
        
    try:
        # Build context
        total_subs = len(df)
        churn_high = len(df[df['risk_tier'] == 'High'])
        revenue_risk = df[df['risk_tier'] == 'High']['arpu'].sum()
        summary_stats = f"Total Subs: {total_subs}, High Risk: {churn_high}, Revenue at Risk: Rs. {revenue_risk:,.2f}"
        
        # Region info
        regional = df.groupby('region').agg(
            total=('subscriber_id', 'count'),
            high_risk=('risk_tier', lambda x: (x == 'High').sum())
        ).reset_index().sort_values('high_risk', ascending=False).head(3)
        regional_data = regional.to_dict(orient='records')
        
        # Top 10 churners
        top_10 = df.sort_values('churn_probability', ascending=False).head(10)[['subscriber_id', 'region', 'churn_probability']]
        top_churners = top_10.to_dict(orient='records')
        
        sys_prompt = f"You are ChurnGuard AI, a DTH churn analytics assistant. Current data: {summary_stats}. Top at-risk regions: {regional_data}. Top 10 high-risk subscribers: {top_churners}. Answer concisely. Always reference actual numbers from the data. Suggest actionable retention strategies. Respond in 3-5 sentences max."

        model = genai.GenerativeModel('gemini-2.5-flash', system_instruction=sys_prompt)
        
        # Convert conversation_history to gemini format
        formatted_history = []
        for msg in req.conversation_history:
            role = "user" if msg['role'] == "user" else "model"
            formatted_history.append({"role": role, "parts": [msg['content']]})
            
        chat = model.start_chat(history=formatted_history)
        response = chat.send_message(req.message)
        
        return {"reply": response.text}
    except Exception as e:
        print(f"Chat error: {e}")
        return {"reply": "I am sorry, I encountered an error connecting to the AI. Did you set GEMINI_API_KEY?"}
"""

content = content + "\n" + endpoint

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated app.py")
