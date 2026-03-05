from flask import Flask, render_template
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)

def get_db_connection():

    conn = psycopg2.connect(
        host="localhost",
        database="site_gestiune", 
        user="postgres",
        password="adsjhfhjngjewfwedkasmdqiwe8327428374n8237wqxemoiew" 
    )
    return conn

@app.route('/')
def index():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Citim produsele din tabelul creat în pgAdmin
    cur.execute("SELECT * FROM products;")
    products = cur.fetchall()
    
    cur.close()
    conn.close()
    
    # Trimitem datele către HTML
    return render_template('index.html', products=products)

if __name__ == '__main__':
    app.run(debug=True)