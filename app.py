import io
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_file
import psycopg2
from psycopg2.extras import RealDictCursor

# Biblioteci pentru export
import pandas as pd
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet

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

# --- RUTE PAGINI PRINCIPALE ---

@app.route('/')
def index():
    conn = get_db_connection()
    if not conn: return "Eroare la baza de date!"
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("SELECT COUNT(*) as total FROM products;")
    total = cur.fetchone()['total'] or 0
    
    query_products = """
        SELECT p.id, p.name, p.sku, p.price, p.stock_min, p.last_audit_status, p.last_audit_diff,
        (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
         COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0)) as stock
        FROM products p;
    """
    cur.execute(query_products)
    products = cur.fetchall()
    
    critical_products = [p for p in products if p['stock'] <= (p['stock_min'] or 0)]
    alerts_count = len(critical_products)
    
    cur.execute("SELECT (SELECT COUNT(*) FROM stock_entries) + (SELECT COUNT(*) FROM stock_exits) as moves;")
    moves = cur.fetchone()['moves'] or 0
    
    stats = {'total': total, 'alerts': alerts_count, 'moves': moves}
    cur.close()
    conn.close()
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

@app.route('/inventar')
def inventar():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    query = """
        SELECT p.id, p.name, p.sku, p.last_audit_status, p.last_audit_diff,
        (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
        COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0)) as stock
        FROM products p;
    """
    cur.execute(query)
    products = cur.fetchall()
    cur.close()
    conn.close()
    return render_template('inventar.html', products=products)

# --- RUTE API & OPERAȚIUNI ---

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

@app.route('/produse/nou', methods=['POST'])
def produs_nou():
    name = request.form.get('name')
    sku = request.form.get('sku')
    price = request.form.get('price')
    stock_min = request.form.get('stock_min')
    conn = get_db_connection()
    if not conn: return jsonify({"status": "error", "message": "Conexiune DB eșuată"}), 500
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO products (name, sku, price, stock_min) 
            VALUES (%s, %s, %s, %s)
        """, (name, sku, float(price) if price else 0, int(stock_min) if stock_min else 0))
        conn.commit()
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    finally:
        conn.close()

@app.route('/api/audit-save', methods=['POST'])
def audit_save():
    data = request.json
    p_id, new_name, new_sku, faptic_quantity = data.get('id'), data.get('name'), data.get('sku'), int(data.get('stock'))
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            SELECT (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = %s), 0) - 
                    COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = %s), 0)) as system_stock
        """, (p_id, p_id))
        system_stock = cur.fetchone()['system_stock']
        diff = faptic_quantity - system_stock
        new_status = 'synced' if diff == 0 else ('shortage' if diff < 0 else 'surplus')
        
        cur.execute("""
            UPDATE products SET name = %s, sku = %s, last_audit_status = %s, last_audit_diff = %s WHERE id = %s
        """, (new_name, new_sku, new_status, diff, p_id))

        if diff > 0: cur.execute("INSERT INTO stock_entries (product_id, quantity) VALUES (%s, %s)", (p_id, diff))
        elif diff < 0: cur.execute("INSERT INTO stock_exits (product_id, quantity) VALUES (%s, %s)", (p_id, abs(diff)))
        
        conn.commit()
        return jsonify({"status": "success", "new_status": new_status, "new_diff": diff})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 400
    finally:
        conn.close()

@app.route('/api/stats/reports')
def get_reports_stats():
    conn = get_db_connection()
    if not conn: return jsonify({"error": "DB connection failed"}), 500
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        query_stats = """
            SELECT COUNT(*) as total_items,
                   COUNT(*) FILTER (WHERE last_audit_status = 'synced' OR last_audit_status IS NULL) as total_ok,
                   ABS(COALESCE(SUM(last_audit_diff) FILTER (WHERE last_audit_diff < 0), 0)) as total_shortage,
                   COALESCE(SUM(last_audit_diff) FILTER (WHERE last_audit_diff > 0), 0) as total_surplus
            FROM products;
        """
        cur.execute(query_stats)
        stats = cur.fetchone()
        cur.execute("SELECT name, sku, last_audit_status, last_audit_diff FROM products ORDER BY name ASC;")
        products = cur.fetchall()
        return jsonify({"stats": stats, "products": products})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# --- RUTE EXPORT ---

@app.route('/rapoarte/export/<format>')
def export_rapoarte(format):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT name, sku, last_audit_status, last_audit_diff FROM products ORDER BY name ASC;")
        data = cur.fetchall()
        timestamp = datetime.now().strftime("%d-%m-%Y_%H-%M")

        if format == 'excel':
            df = pd.DataFrame(data)
            df.columns = ['Nume Produs', 'Cod SKU', 'Status Audit', 'Diferenta']
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Audit')
            output.seek(0)
            return send_file(output, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                             as_attachment=True, download_name=f"Raport_Audit_{timestamp}.xlsx")

        elif format == 'pdf':
            output = io.BytesIO()
            doc = SimpleDocTemplate(output, pagesize=A4)
            elements = []
            styles = getSampleStyleSheet()
            elements.append(Paragraph("Raport Audit Inventar", styles['Title']))
            elements.append(Paragraph(f"Generat la: {datetime.now().strftime('%d.%m.%Y %H:%M')}", styles['Normal']))
            elements.append(Spacer(1, 12))

            table_data = [['Produs', 'SKU', 'Status', 'Diferenta']]
            for row in data:
                table_data.append([row['name'], row['sku'], (row['last_audit_status'] or 'synced').upper(), f"{row['last_audit_diff']:+d}"])

            t = Table(table_data, colWidths=[200, 100, 100, 80])
            t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#064e3b')),
                                   ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                                   ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                                   ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)]))
            elements.append(t)
            doc.build(elements)
            output.seek(0)
            return send_file(output, mimetype='application/pdf', as_attachment=True, download_name=f"Raport_Audit_{timestamp}.pdf")
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/stats/stock-flow')
def stock_flow():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    query = """
        SELECT TO_CHAR(d.day, 'Dy') as zi, COALESCE(SUM(se.quantity), 0) as total
        FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') d(day)
        LEFT JOIN stock_exits se ON se.exit_date::date = d.day::date
        GROUP BY d.day ORDER BY d.day ASC;
    """
    try:
        cur.execute(query)
        results = cur.fetchall()
        zile_ro = {'Mon': 'Lun', 'Tue': 'Mar', 'Wed': 'Mie', 'Thu': 'Joi', 'Fri': 'Vin', 'Sat': 'Sâm', 'Sun': 'Dum'}
        return jsonify({
            "labels": [zile_ro.get(row['zi'], row['zi']) for row in results],
            "values": [float(row['total']) for row in results]
        })
    finally:
        conn.close()

@app.route('/dashboard') # <--- Aceasta trebuie să coincidă cu href-ul din JS
def dashboard():
    return render_template('panou.html') # sau index.html, cum l-ai numit
@app.route('/intrari')
def intrari(): return "Pagina Intrări în lucru"

@app.route('/iesiri')
def iesiri(): return "Pagina Ieșiri în lucru"

@app.route('/furnizori')
def furnizori(): return "Pagina Furnizori în lucru"

@app.route('/rapoarte')
def rapoarte_pagina(): return "Pagina Rapoarte în lucru"


@app.route('/api/product-delete/<int:id>', methods=['DELETE'])
def delete_product(id):
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM products WHERE id = %s", (id,))
        conn.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    finally:
        conn.close()

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
    
 