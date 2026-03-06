from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
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
    
    # 1. TOTAL PRODUSE (Din tabelul products)
    cur.execute("SELECT COUNT(*) as total FROM products;")
    total = cur.fetchone()['total'] or 0
    
    # 2. PRODUSE PENTRU TABEL ȘI CALCUL ALERTE
    # Calculăm stocul real: Intrări - Ieșiri
    query_products = """
        SELECT p.id, p.name, p.sku, p.stock_min,
        (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
        COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0)) as stock
        FROM products p;
    """
    cur.execute(query_products)
    products = cur.fetchall()
    
    # 3. DATE PENTRU CARDUL "STOC CRITIC" (Doar cele sub limită)
    critical_products = [p for p in products if p['stock'] <= p['stock_min']]
    alerts_count = len(critical_products)
    
    # 4. MIȘCĂRI TOTALE (Toate înregistrările de flow)
    cur.execute("SELECT (SELECT COUNT(*) FROM stock_entries) + (SELECT COUNT(*) FROM stock_exits) as moves;")
    moves = cur.fetchone()['moves'] or 0
    
    stats = {'total': total, 'alerts': alerts_count, 'moves': moves}
    
    cur.close()
    conn.close()
    
    # Trimitem produsele critice separat pentru a le afișa în lista din dreapta
    return render_template('index.html', products=products, stats=stats, critical_products=critical_products[:5])

@app.route('/produse')
def produse():
    conn = get_db_connection()
    if not conn: return "Eroare la baza de date!"
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
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

@app.route('/add_product', methods=['POST'])
def add_product():
    name = request.form['name']
    sku = request.form['sku']
    stock_min = request.form['stock_min']
    
    conn = get_db_connection()
    if conn:
        cur = conn.cursor()
        cur.execute("INSERT INTO products (name, sku, stock_min) VALUES (%s, %s, %s)", (name, sku, stock_min))
        conn.commit()
        cur.close()
        conn.close()
    return redirect(url_for('index'))

@app.route('/api/stats/stock-flow')
def stock_flow():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "DB connection failed"}), 500
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Query inteligent: generează ultimele 7 zile și face JOIN cu ieșirile reale.
    # Asta asigură că dacă într-o zi nu ai vânzări, apare "0" în loc să lipsească ziua.
    query = """
        SELECT 
            TO_CHAR(d.day, 'Dy') as zi, 
            COALESCE(SUM(se.quantity), 0) as total
        FROM 
            generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') d(day)
        LEFT JOIN 
            stock_exits se ON se.exit_date::date = d.day::date
        GROUP BY 
            d.day
        ORDER BY 
            d.day ASC;
    """
    
    try:
        cur.execute(query)
        results = cur.fetchall()
        
        # Mapare pentru a traduce zilele în Română
        zile_ro = {'Mon': 'Lun', 'Tue': 'Mar', 'Wed': 'Mie', 'Thu': 'Joi', 'Fri': 'Vin', 'Sat': 'Sâm', 'Sun': 'Dum'}
        
        labels = [zile_ro.get(row['zi'], row['zi']) for row in results]
        values = [float(row['total']) for row in results]
            
        return jsonify({
            "labels": labels,
            "values": values
        })
    except Exception as e:
        print(f"Eroare API: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/inventar')
def inventar():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Luăm toate produsele și stocul lor calculat
    query = """
        SELECT p.id, p.name, p.sku,
        (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
         COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0)) as current_stock
        FROM products p
        ORDER BY p.name ASC;
    """
    cur.execute(query)
    products = cur.fetchall()
    cur.close()
    conn.close()
    return render_template('inventar.html', products=products)

@app.route('/produse/nou', methods=['POST'])
def produs_nou():
    # Colectăm datele trimise din Modal
    name = request.form.get('name')
    sku = request.form.get('sku')
    price = request.form.get('price')
    stock_min = request.form.get('stock_min')

    conn = get_db_connection()
    if not conn:
        return jsonify({"status": "error", "message": "Conexiune DB eșuată"}), 500

    try:
        cur = conn.cursor()
        # Inserăm datele. Folosim float() și int() pentru siguranță.
        cur.execute("""
            INSERT INTO products (name, sku, price, stock_min) 
            VALUES (%s, %s, %s, %s)
        """, (name, sku, float(price) if price else 0, int(stock_min) if stock_min else 0))
        
        conn.commit()
        cur.close()
        conn.close()
        
        # Trimitem succes către JavaScript (care va închide modalul)
        return jsonify({"status": "success"}), 200

    except Exception as e:
        print(f"Eroare la inserare: {e}")
        # Dacă SKU-ul există deja sau e altă eroare, trimitem mesajul înapoi
        return jsonify({"status": "error", "message": "SKU-ul trebuie să fie unic sau datele sunt invalide"}), 400



@app.route('/api/update-product-full', methods=['POST'])
def update_product_full():
    data = request.json
    p_id = data.get('id')
    new_name = data.get('name')
    new_sku = data.get('sku')
    faptic_quantity = int(data.get('quantity'))

    conn = get_db_connection()
    if not conn: return jsonify({"status": "error", "message": "DB Connection Error"}), 500
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 1. Obținem stocul actual din sistem înainte de update
        query_stock = """
            SELECT (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = %s), 0) - 
                    COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = %s), 0)) as system_stock
        """
        cur.execute(query_stock, (p_id, p_id))
        system_stock = cur.fetchone()['system_stock']

        # 2. Actualizăm datele de bază (Nume, SKU)
        cur.execute("UPDATE products SET name = %s, sku = %s WHERE id = %s", (new_name, new_sku, p_id))

        # 3. Calculăm diferența pentru Audit
        diff = faptic_quantity - system_stock

        if diff > 0:
            # Surplus -> Inserăm o intrare de ajustare
            cur.execute("INSERT INTO stock_entries (product_id, quantity) VALUES (%s, %s)", (p_id, diff))
        elif diff < 0:
            # Lipsă -> Inserăm o ieșire de ajustare (diff e negativ, deci folosim valoarea absolută)
            cur.execute("INSERT INTO stock_exits (product_id, quantity) VALUES (%s, %s)", (p_id, abs(diff)))

        conn.commit()
        return jsonify({"status": "success", "new_stock": faptic_quantity})
    except Exception as e:
        conn.rollback()
        print(f"Audit Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 400
    finally:
        cur.close()
        conn.close()


@app.route('/api/audit-save', methods=['POST'])
def audit_save():
    data = request.json
    p_id = data.get('id')
    new_name = data.get('name')
    new_sku = data.get('sku')
    faptic_quantity = int(data.get('stock'))

    conn = get_db_connection()
    if not conn: return jsonify({"status": "error", "message": "DB Error"}), 500
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 1. Calculăm stocul curent din sistem (Intrări - Ieșiri)
        cur.execute("""
            SELECT (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = %s), 0) - 
                    COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = %s), 0)) as system_stock
        """, (p_id, p_id))
        system_stock = cur.fetchone()['system_stock']

        # 2. Actualizăm Numele și SKU-ul în tabelul products
        cur.execute("UPDATE products SET name = %s, sku = %s WHERE id = %s", (new_name, new_sku, p_id))

        # 3. Calculăm diferența pentru Audit
        diff = faptic_quantity - system_stock

        if diff > 0:
            # Surplus -> Adăugăm o intrare de ajustare
            cur.execute("INSERT INTO stock_entries (product_id, quantity) VALUES (%s, %s)", (p_id, diff))
        elif diff < 0:
            # Lipsă -> Adăugăm o ieșire de ajustare (folosim valoarea absolută)
            cur.execute("INSERT INTO stock_exits (product_id, quantity) VALUES (%s, %s)", (p_id, abs(diff)))

        conn.commit()
        return jsonify({"status": "success", "new_system_stock": faptic_quantity})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 400
    finally:
        cur.close()
        conn.close()

@app.route('/rapoarte/export/<format>')
def export_rapoarte(format):
    # Aici vei genera PDF sau Excel (pentru licență e bine să menționezi biblioteci ca ReportLab sau Pandas)
    return jsonify({"status": "success", "message": f"Raport {format} generat cu succes!"})


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)