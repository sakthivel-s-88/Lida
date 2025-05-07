from flask import Flask, render_template, request, jsonify,session
import lida
from flask_cors import CORS 
from lida import Manager, TextGenerationConfig, llm
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from cryptography.fernet import Fernet
key = Fernet.generate_key()
cipher_suite = Fernet(key)

app = Flask(__name__)
app.secret_key = "your_secret_key" 
CORS(app)

textgen_config = TextGenerationConfig(n=1, temperature=0.5, model="gpt-3.5-turbo", use_cache=True)

@app.route('/set_api_key', methods=['POST'])
def set_api_key():
    try:
        data = request.get_json()
       
        api_key = data.get('api_key')
        encrypted_api_key = cipher_suite.encrypt(api_key.encode())
        if not api_key:
            return jsonify({"message": "API key is required"}), 400

        session['api_key'] = encrypted_api_key

        return jsonify({"message": "API key set successfully!"}), 200
    except Exception as e:
        return jsonify({"message": f"An error occurred: {str(e)}"}), 500
    

@app.route('/charts')
def charts():
    goal = request.args.get('goal')
    
    if not goal:
        return "Goal not provided", 400  
    
    try:
        api_key = cipher_suite.decrypt(session['api_key']).decode()
        
        lida = Manager(text_gen=llm("openai", api_key=api_key))

        library = "matplotlib"
      
        print(goal)
      
        summary = lida.summarize("/Users/ishwarya/Desktop/lida_main/fee_report.csv", summary_method="default", textgen_config=textgen_config)
        charts = lida.visualize(summary=summary, goal=goal, textgen_config=textgen_config, library=library)
    
        chart_base64 = charts[0]
        print(chart_base64)
        return jsonify({"goal": goal, "chart_base64": chart_base64.raster})
        
    
    except Exception as e:
        return f"An error occurred: {str(e)}", 500

@app.route('/goals')
def index():
    purpose = request.args.get('purpose',type=str)
    print(purpose)
    print("no")
    if purpose == "fee":
        path = "/Users/ishwarya/Desktop/lida_main/fee_report.csv"
    else:
        path = "/Users/ishwarya/Desktop/lida_main/fee_report.csv"
    api_key = cipher_suite.decrypt(session['api_key']).decode()
    lida = Manager(text_gen=llm("openai", api_key=api_key))
    summary = lida.summarize(path, summary_method="default", textgen_config=textgen_config)
    print(summary)
    session['summary'] = summary
    goals = lida.goals(summary, n=5, textgen_config=textgen_config)
    print(goals)
  
    return render_template('dashboard.html', goal_list=goals)



@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html') 
@app.route('/api')
def apikey():
    return render_template('api_key.html')

if __name__ == '__main__':
    app.run(debug=True,port=5001)
