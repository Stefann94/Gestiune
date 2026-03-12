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
    
    # 1. Extragem TOATE coloanele, inclusiv cele de audit
    query_products = """
        SELECT p.*, 
        (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
         COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0)) as current_calculated_stock
        FROM products p;
    """
    cur.execute(query_products)
    products = cur.fetchall()
    
    # 2. Statistici simple
    cur.execute("SELECT COUNT(*) as total FROM products;")
    total = cur.fetchone()['total'] or 0
    
    critical_products = [p for p in products if (p['current_calculated_stock'] or 0) < 0]
    
    cur.execute("SELECT (SELECT COUNT(*) FROM stock_entries) + (SELECT COUNT(*) FROM stock_exits) as moves;")
    moves = cur.fetchone()['moves'] or 0
    
    stats = {'total': total, 'alerts': len(critical_products), 'moves': moves}
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
    SELECT 
        p.id,
        p.name,
        p.sku,
        p.last_audit_status,
        p.last_audit_diff,
        p.last_faptic_value,

        COALESCE(
            p.last_system_stock,
            (
                COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id),0)
                -
                COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id),0)
            )
        ) as stock_sistem,

        COALESCE(
            p.last_faptic_value,
            (
                COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id),0)
                -
                COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id),0)
            )
        ) as stock_faptic

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
    
    # Noile câmpuri
    sys_stock = int(request.form.get('system_stock', 0))
    fap_stock = int(request.form.get('faptic_stock', 0))
    
    # Calculăm statusul auditului inițial
    diff = fap_stock - sys_stock
    audit_status = 'synced' if diff == 0 else ('shortage' if diff < 0 else 'surplus')

    conn = get_db_connection()
    if not conn: return jsonify({"status": "error", "message": "Conexiune DB eșuată"}), 500
    
    try:
        cur = conn.cursor()
        
        # 1. Inserăm produsul cu valorile de audit inițiale
        cur.execute("""
            INSERT INTO products (name, sku, price, stock_min, last_system_stock, last_faptic_value, last_audit_diff, last_audit_status) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (name, sku, float(price) if price else 0, int(stock_min) if stock_min else 0, 
              sys_stock, fap_stock, diff, audit_status))
        
        product_id = cur.fetchone()[0]

        # 2. IMPORTANT: Creăm o intrare în stoc pentru a valida cantitatea faptică
        # Dacă ai adus 10 bucăți, trebuie să existe o tranzacție de intrare de 10
        if fap_stock > 0:
            cur.execute("""
                INSERT INTO stock_entries (product_id, quantity, entry_date)
                VALUES (%s, %s, NOW())
            """, (product_id, fap_stock))

        conn.commit()
        return jsonify({"status": "success"}), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 400
    finally:
        conn.close()


@app.route('/panou')  # <--- Aceasta este ruta pe care o caută window.location.href
def orice_nume():
    return render_template('panou.html')




@app.route('/api/audit-save', methods=['POST'])
def audit_save():
    data = request.json
    p_id = data.get('id')
    faptic_input = int(data.get('stock'))
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # 1. Aflăm stocul de sistem (care NU se va schimba)
        cur.execute("""
            SELECT (
                COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = %s), 0) - 
                COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = %s), 0)
            ) as stoc_sistem
        """, (p_id, p_id))
        
        stoc_sistem = cur.fetchone()['stoc_sistem'] or 0
        
        # 2. Calculăm diferența față de sistemul înghețat
        # 92 (faptic) - 96 (sistem) = -4
        diferenta_audit = faptic_input - stoc_sistem 
        
        status_nou = 'synced' if diferenta_audit == 0 else ('shortage' if diferenta_audit < 0 else 'surplus')

        # 3. Salvăm auditul în coloane separate, fără să atingem tabelele de mișcări
        cur.execute("""
            UPDATE products 
            SET last_audit_status = %s,
                last_audit_diff = %s,
                last_faptic_value = %s,
                last_system_stock = %s
            WHERE id = %s
        """, (status_nou, diferenta_audit, faptic_input, stoc_sistem, p_id))
        
        conn.commit()
        return jsonify({
            "status": "success", 
            "new_status": status_nou, 
            "new_diff": diferenta_audit
        })
    except Exception as e:
        if conn: conn.rollback()
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

@app.route('/dashboard')
def dashboard():
    conn = get_db_connection()
    if not conn: 
        return "Eroare la conexiunea cu baza de date!"
    
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # 1. Valoare Inventar (Preț Unitar * Stoc Curent pentru fiecare produs)
        query_valoare = """
            SELECT SUM(p.price * (
                COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
                COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0)
            )) as total_valoare FROM products p;
        """
        cur.execute(query_valoare)
        valoare_inventar = cur.fetchone()['total_valoare'] or 0

        # 2. Urgențe Stoc (Numărăm toate produsele care au stocul <= 20 unități)
        query_urgente_count = """
            SELECT COUNT(*) as count FROM (
                SELECT (
                    COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
                    COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0)
                ) as current_stock
                FROM products p
            ) as inv WHERE current_stock <= 20;
        """
        cur.execute(query_urgente_count)
        urgente_count = cur.fetchone()['count'] or 0

        # 3. Flux Ieșiri (Total unități ieșite din stoc în ultimele 24 de ore)
        cur.execute("""
            SELECT SUM(quantity) as iesiri 
            FROM stock_exits 
            WHERE exit_date > NOW() - INTERVAL '24 hours';
        """)
        flux_iesiri = cur.fetchone()['iesiri'] or 0

        # 4. Tabel Monitorizare (Lista produselor care sunt sub pragul de 20)
        # Acestea vor apărea în tabelul din josul paginii panou.html
        query_critice = """
            SELECT p.name, p.stock_min,
            (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
             COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0)) as stock
            FROM products p
            WHERE (
                COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
                COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0)
            ) <= 20
            ORDER BY stock ASC
            LIMIT 10;
        """
        cur.execute(query_critice)
        produse_critice = cur.fetchall()

        return render_template('panou.html', 
                               valoare=valoare_inventar, 
                               urgente=urgente_count, 
                               flux=flux_iesiri,
                               critice=produse_critice)

    except Exception as e:
        print(f"Eroare Dashboard: {e}")
        return f"A intervenit o eroare la procesarea datelor: {e}"
    
    finally:
        cur.close()
        conn.close()
    
@app.route('/api/stats/categorii')
def stats_categorii():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Facem JOIN între products și categories pentru a lua numele real al categoriei
    query = """
        SELECT c.name as categorie, SUM(p.price * (
            COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
            COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0)
        )) as valoare
        FROM products p
        JOIN categories c ON p.category_id = c.id
        GROUP BY c.name;
    """
    
    try:
        cur.execute(query)
        rows = cur.fetchall()
        
        # Dacă nu ai date încă, trimitem niște valori goale să nu crape JS-ul
        if not rows:
            return jsonify({"labels": ["Fără date"], "values": [0]})

        return jsonify({
            "labels": [r['categorie'] for r in rows],
            "values": [float(r['valoare']) for r in rows]
        })
    except Exception as e:
        print(f"Eroare SQL: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/stats/top-produse')
def top_produse():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "DB connection failed"}), 500
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Top 5 cele mai scumpe
        cur.execute("SELECT name, price FROM products ORDER BY price DESC LIMIT 5;")
        scumpe = cur.fetchall()

        # 2. Top 5 cele mai vândute (Calculate ca diferență reală)
        # Calculăm: (Sistem - Faptic) as total_vandut
        # Punem condiția WHERE stoc_sistem > stoc_faptic pentru a vedea doar ieșirile
        cur.execute("""
            SELECT name, 
                   (last_system_stock - last_faptic_value) as total_vandut
            FROM products 
            WHERE last_audit_status = 'shortage' 
              AND last_system_stock > last_faptic_value
            ORDER BY total_vandut DESC
            LIMIT 5;
        """)
        vandute = cur.fetchall()

        return jsonify({
            "scumpe": scumpe,
            "vandute": vandute
        })
    except Exception as e:
        print(f"Eroare API top-produse: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/stats/urgente-detaliate')
def urgente_detaliate():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "DB connection failed"}), 500
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        query = """
            SELECT 
                p.name, 
                p.sku,
                price,
                -- 1. Stocul de Sistem (Calculat strict din intrări minus ieșiri)
                (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
                 COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0)) as stoc_sistem,
                
                -- 2. Stocul Faptic (Ultimul audit, sau calculul dacă auditul e NULL)
                COALESCE(p.last_faptic_value, 
                    (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
                     COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0))
                ) as stoc_faptic
            FROM products p
            WHERE 
                -- Filtrarea se face pe valoarea Faptică
                COALESCE(p.last_faptic_value, 
                    (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
                     COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0))
                ) <= 20
            ORDER BY stoc_faptic ASC;
        """
        cur.execute(query)
        produse = cur.fetchall()

        # Clasificăm produsele pe coloane folosind 'stoc_faptic'
        categorii = {
            "critice": [p for p in produse if p['stoc_faptic'] < 0],
            "limitate": [p for p in produse if 0 <= p['stoc_faptic'] <= 10],
            "atentie": [p for p in produse if 10 < p['stoc_faptic'] <= 20]
        }
        
        return jsonify(categorii)
    except Exception as e:
        print(f"Eroare Urgente: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/intrari')
def intrari(): return "Pagina Intrări în lucru"

@app.route('/iesiri')
def iesiri(): return "Pagina Ieșiri în lucru"

@app.route('/furnizori')
def furnizori(): return "Pagina Furnizori în lucru"

@app.route('/rapoarte')
def rapoarte_pagina(): return "Pagina Rapoarte în lucru"


from flask import request, jsonify


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
    
 