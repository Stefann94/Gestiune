from flask import Flask, render_template, request, redirect, url_for, flash
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)
app.secret_key = "cheie_secreta_pentru_sesiuni"

def get_db_connection():
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="site_gestiune", 
            user="postgres",
            password="adsjhfhjngjewfwedkasmdqiwe8327428374n8237wqxemoiew" 
        )
        return conn
    except Exception as e:
        print(f"Eroare la conectarea DB: {e}")
        return None

@app.route('/')
def index():
    conn = get_db_connection()
    if not conn: return "Eroare la baza de date!"
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Statistici pentru Dashboard (Hero)
    cur.execute("SELECT COUNT(*) as total FROM products;")
    total = cur.fetchone()['total'] or 0
    
    # Lista produse pentru tabel
    cur.execute("""
        SELECT p.id, p.name, p.sku, p.stock_min,
        (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
         COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0)) as stock
        FROM products p;
    """)
    products = cur.fetchall()
    
    # Număr alerte (stoc sub minim)
    alerts = sum(1 for p in products if p['stock'] <= p['stock_min'])
    
    stats = {'total': total, 'alerts': alerts, 'moves': 0}
    
    cur.close()
    conn.close()
    return render_template('index.html', products=products, stats=stats)

# --- RUTA PENTRU PAGINA DE PRODUSE ---
@app.route('/produse')
def produse():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Calculăm stocul pentru fiecare produs ca să-l afișăm în tabel
    query = """
        SELECT p.id, p.name, p.sku, p.price, p.stock_min,
        (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
         COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0)) as stock
        FROM products p
        ORDER BY p.id DESC;
    """
    cur.execute(query)
    all_products = cur.fetchall()
    cur.close()
    conn.close()
    return render_template('produse.html', products=all_products)

# --- RUTA ADAUGARE PRODUS ---
@app.route('/add_product', methods=['POST'])
def add_product():
    name = request.form['name']
    sku = request.form['sku']
    stock_min = request.form['stock_min']
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("INSERT INTO products (name, sku, stock_min) VALUES (%s, %s, %s)", (name, sku, stock_min))
    conn.commit()
    cur.close()
    conn.close()
    return redirect(url_for('index'))

if __name__ == "__main__":
     app.run(debug=True, host="127.0.0.1", port=5000)