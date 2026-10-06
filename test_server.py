from flask import Flask
app = Flask(__name__)

@app.route('/test')
def test():
    import sys
    print("PRINT TO STDOUT", flush=True)
    sys.stderr.write("PRINT TO STDERR\n")
    return "OK"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3001, debug=False)
