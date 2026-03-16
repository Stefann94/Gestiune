import io
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_file
import psycopg2
from psycopg2.extras import RealDictCursor
from werkzeug.security import generate_password_hash, check_password_hash
from flask import session

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
    if not conn: 
        return "Eroare la baza de date!"
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # 1. Extragem toate produsele cu stocul calculat curent
        # Folosim acest query pentru tabelul principal și pentru lista de urgențe
        query_products = """
            SELECT p.*, 
            (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
             COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0)) as current_calculated_stock
            FROM products p;
        """
        cur.execute(query_products)
        products = cur.fetchall()
        
        # --- STATISTICI PENTRU HERO SECTION ---
        
        # A. Total Articole: Numărul real de rânduri din tabelul products
        cur.execute("SELECT COUNT(*) as total FROM products;")
        total_items = cur.fetchone()['total'] or 0
        
        # B. Sub Limită: Doar produsele care au statusul specific de 'shortage' (din audit)
        cur.execute("SELECT COUNT(*) as alerts FROM products WHERE last_audit_status = 'shortage';")
        shortage_alerts = cur.fetchone()['alerts'] or 0
        
        # C. Mișcări Azi: Orice interacțiune cu DB (Intrări + Ieșiri + Audituri efectuate AZI)
        # Verificăm intrările/ieșirile de azi și produsele actualizate (updated_at) azi
        query_moves = """
            SELECT (
                (SELECT COUNT(*) FROM stock_entries WHERE entry_date::date = CURRENT_DATE) +
                (SELECT COUNT(*) FROM stock_exits WHERE exit_date::date = CURRENT_DATE) +
                (SELECT COUNT(*) FROM products WHERE updated_at::date = CURRENT_DATE)
            ) as moves_today;
        """
        cur.execute(query_moves)
        moves_today = cur.fetchone()['moves_today'] or 0
        
        # Pregătim obiectul stats pentru frontend
        stats = {
            'total': total_items, 
            'alerts': shortage_alerts, 
            'moves': moves_today
        }
        
        # 2. Produse Critice (pentru widget-ul de alertă din Dashboard)
        # Păstrăm logica de afișare a produselor unde stocul calculat < pragul minim setat
        critical_products = [p for p in products if (p['current_calculated_stock'] or 0) <= (p['stock_min'] or 0)]
        
        # 3. Categorii pentru select-ul din modal
        cur.execute("SELECT * FROM categories ORDER BY name ASC;")
        categories = cur.fetchall()

    except Exception as e:
        print(f"Eroare la procesarea datelor: {e}")
        return f"Eroare sistem: {e}"
    finally:
        cur.close()
        conn.close()
    
    return render_template('index.html', 
                           products=products, 
                           stats=stats, 
                           critical_products=critical_products[:5], 
                           categories=categories)

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
    category_id = request.form.get('category_id')
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
        cur.execute("""
            INSERT INTO products (name, sku, price, category_id, stock_min, last_system_stock, 
                                last_faptic_value, last_audit_diff, last_audit_status, updated_at) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING id
        """, (name, sku, float(price) if price else 0, category_id, 
              int(stock_min) if stock_min else 0, sys_stock, fap_stock, diff, audit_status))
        
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
    # Valoarea faptică introdusă de utilizator în tabelul de audit
    noua_valoare_faptica = int(data.get('stock'))
    
    conn = get_db_connection()
    if not conn: 
        return jsonify({"status": "error", "message": "DB Connection Error"}), 500
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # 1. Calculăm stocul de sistem actual (din tranzacții: Intrări - Ieșiri)
        cur.execute("""
            SELECT (
                COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = %s), 0) - 
                COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = %s), 0)
            ) as stoc_sistem
        """, (p_id, p_id))
        
        row = cur.fetchone()
        stoc_sistem = row['stoc_sistem'] if row else 0
        
        # 2. Calculăm noua diferență și statusul
        diferenta_noua = noua_valoare_faptica - stoc_sistem
        status_nou = 'synced' if diferenta_noua == 0 else ('shortage' if diferenta_noua < 0 else 'surplus')

        # 3. ACTUALIZĂM produsele
        # IMPORTANT: Am adăugat updated_at = NOW() ca să apară la "Mișcări Azi"
        cur.execute("""
            UPDATE products 
            SET last_faptic_value = %s,
                last_system_stock = %s,
                last_audit_diff = %s,
                last_audit_status = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (noua_valoare_faptica, stoc_sistem, diferenta_noua, status_nou, p_id))
        
        conn.commit()
        
        return jsonify({
            "status": "success",
            "message": "Audit salvat! Mișcarea a fost înregistrată.",
            "new_faptic": noua_valoare_faptica,
            "new_status": status_nou,
            "new_diff": diferenta_noua
        })
        
    except Exception as e:
        if conn: conn.rollback()
        print(f"Eroare la salvare audit: {e}")
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

        # 2. Urgențe Stoc (Numărăm doar produsele care respectă noua regulă)
        query_urgente_count = """
            SELECT COUNT(*) as count FROM (
                SELECT 
                    p.id,
                    (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
                     COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0)) as stoc_sistem,
                    COALESCE(p.last_faptic_value, 
                        (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
                         COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0))
                    ) as stoc_faptic
                FROM products p
            ) as inv 
            WHERE inv.stoc_faptic < 20 
              AND inv.stoc_faptic < inv.stoc_sistem;
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

        # --- IMPLEMENTARE NOUĂ ---
        # 4. Categorii Totale (Numărăm toate categoriile din tabelă, indiferent dacă au produse sau nu)
        cur.execute("SELECT COUNT(*) as count FROM categories;")
        categorii_totale = cur.fetchone()['count'] or 0
        # -------------------------

        # 5. Tabel Monitorizare (Lista produselor care sunt sub pragul de 20)
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
                               nr_categorii=categorii_totale,
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
        # Folosim un query care calculează stocurile întâi, apoi aplică filtrele cerute
        query = """
            WITH StockData AS (
                SELECT
                    p.id, 
                    p.name, 
                    p.sku,
                    p.price,
                    -- Calculăm Stoc Sistem (Intrări - Ieșiri)
                    (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
                     COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0)) as stoc_sistem,
                    
                    -- Calculăm Stoc Faptic (Ultimul audit sau calculul matematic)
                    COALESCE(p.last_faptic_value, 
                        (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
                         COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0))
                    ) as stoc_faptic
                FROM products p
            )
            SELECT * FROM StockData
            WHERE 
                stoc_faptic < 20             -- Regula 1: Fapticul să fie sub 20
                AND stoc_faptic < stoc_sistem -- Regula 2: Fapticul să fie mai mic decât sistemul (lipsă stoc)
            ORDER BY stoc_faptic ASC;
        """
        cur.execute(query)
        produse = cur.fetchall()

        # Clasificăm produsele pe coloane folosind 'stoc_faptic'
        # Logica de Python rămâne neschimbată pentru a nu afecta restul interfeței
        categorii = {
            "critice": [p for p in produse if p['stoc_faptic'] <= 0],
            "limitate": [p for p in produse if 0 < p['stoc_faptic'] <= 10],
            "atentie": [p for p in produse if 10 < p['stoc_faptic'] < 20]
        }
        
        return jsonify(categorii)
    except Exception as e:
        print(f"Eroare Urgente: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/stats-quick')
def get_quick_stats():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Reutilizăm logica ta de numărare generală
    query_moves = """
    SELECT (
        (SELECT COUNT(*) FROM stock_entries WHERE entry_date::date = CURRENT_DATE) +
        (SELECT COUNT(*) FROM stock_exits WHERE exit_date::date = CURRENT_DATE) +
        (SELECT COUNT(*) FROM products WHERE updated_at::date = CURRENT_DATE)
    ) as moves_today,
        (SELECT COUNT(*) FROM products) as total_items,
        (SELECT COUNT(*) FROM products WHERE last_audit_status = 'shortage') as alerts;
    """
    cur.execute(query_moves)
    stats = cur.fetchone()
    conn.close()
    return jsonify(stats)


@app.route('/api/stats/categorii-active')
def stats_categorii_active():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "DB connection failed"}), 500
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Folosim un CTE pentru a calcula stocurile o singură dată
        query = """
        WITH ProductStock AS (
            SELECT
                p.id,
                p.name,
                p.category_id,
                p.price,
                COALESCE(p.last_faptic_value, 0) as stock_faptic,
                (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) -
                 COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0)) as stock_sistem
            FROM products p
        )
        SELECT 
            c.id as cat_id,
            c.name as categorie,
            COUNT(ps.id) as nr_produse,
            SUM(ps.price * ps.stock_sistem) as valoare_totala_categorie,
            -- Subquery pentru produsul cu diferența maximă (Sistem - Faptic)
            (SELECT ps2.name 
             FROM ProductStock ps2 
             WHERE ps2.category_id = c.id 
               AND ps2.stock_faptic < ps2.stock_sistem
             ORDER BY (ps2.stock_sistem - ps2.stock_faptic) DESC 
             LIMIT 1) as top_produs_nume,
            (SELECT (ps2.stock_sistem - ps2.stock_faptic)
             FROM ProductStock ps2 
             WHERE ps2.category_id = c.id 
               AND ps2.stock_faptic < ps2.stock_sistem
             ORDER BY (ps2.stock_sistem - ps2.stock_faptic) DESC 
             LIMIT 1) as top_produs_dif
        FROM categories c
        LEFT JOIN ProductStock ps ON c.id = ps.category_id
        GROUP BY c.id, c.name
        HAVING COUNT(ps.id) > 0
        ORDER BY valoare_totala_categorie DESC;
        """
        cur.execute(query)
        rows = cur.fetchall()

        return jsonify({
            "detalii": [
                {
                    "nume": r["categorie"],
                    "produse": r["nr_produse"],
                    "valoare": float(r["valoare_totala_categorie"] or 0),
                    "top_produs": {
                        "nume": r["top_produs_nume"],
                        "diferenta": int(r["top_produs_dif"] or 0)
                    } if r["top_produs_nume"] else None
                } for r in rows
            ]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/stats/flux-iesiri')
def get_flux_iesiri():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Folosim coloanele tale reale din tabelul 'products'
        cur.execute("""
            SELECT 
                p.name as nume, 
                c.name as categorie, 
                p.price as pret, 
                p.last_system_stock as sistem, 
                p.last_faptic_value as faptic
            FROM products p
            JOIN categories c ON p.category_id = c.id
            WHERE p.last_system_stock > p.last_faptic_value
        """)
        produse = cur.fetchall()
        
        iesiri = []
        for p in produse:
            # Calculăm unitățile ieșite (Diferența)
            sistem = p['sistem'] if p['sistem'] is not None else 0
            faptic = p['faptic'] if p['faptic'] is not None else 0
            dif = sistem - faptic
            
            if dif > 0:
                iesiri.append({
                    "nume": p['nume'],
                    "categorie": p['categorie'],
                    "pret": float(p['pret']),
                    "unitati": int(dif)
                })

        # Sortăm după volumul ieșirilor
        iesiri = sorted(iesiri, key=lambda x: x['unitati'], reverse=True)
        return jsonify(iesiri)

    except Exception as e:
        # Debugging în consolă să vezi dacă mai crapă ceva
        print(f"Eroare SQL Flux: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()
        
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    full_name = data.get('full_name')
    
    if not username or not password or not full_name:
        return jsonify({"status": "error", "message": "Toate câmpurile sunt obligatorii!"}), 400

    hashed_pw = generate_password_hash(password)
    
    conn = get_db_connection()
    if not conn: 
        return jsonify({"status": "error", "message": "Eroare conexiune DB"}), 500
    
    cur = conn.cursor()
    try:
        # Aici am schimbat 'operator' cu 'pending'
        # NOW() va popula coloana created_at din imaginea ta
        cur.execute("""
            INSERT INTO users (username, password_hash, full_name, role, created_at)
            VALUES (%s, %s, %s, 'pending', NOW())
        """, (username, hashed_pw, full_name))
        
        conn.commit()
        return jsonify({"status": "success", "message": "Utilizator înregistrat cu succes! Contul este în așteptare."})

    except Exception as e:
        conn.rollback() # Esențial ca să nu blochezi baza de date la eroare
        error_msg = str(e)
        
        if "unique" in error_msg.lower():
            return jsonify({"status": "error", "message": "Numele de utilizator este deja luat!"}), 400
        elif "check constraint" in error_msg.lower():
            return jsonify({"status": "error", "message": "Rolul 'pending' nu este permis de baza de date. Rulează SQL-ul de update!"}), 400
        
        return jsonify({"status": "error", "message": "Eroare neprevăzută la înregistrare."}), 500
        
    finally:
        cur.close()
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("SELECT * FROM users WHERE username = %s", (username,))
    user = cur.fetchone()

    if user and check_password_hash(user['password_hash'], password):
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['role'] = user['role']
        
        # Update last_login (coloana ta din imagine)
        cur.execute("UPDATE users SET last_login = NOW() WHERE id = %s", (user['id'],))
        conn.commit()
        conn.close()
        
        return jsonify({"status": "success", "redirect": url_for('dashboard')})
    
    conn.close()
    return jsonify({"status": "error", "message": "Utilizator sau parolă incorectă!"}), 401  

@app.route('/api/get_all_users_with_roles', methods=['GET'])
def get_all_users_with_roles():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor) 
    try:
        # Luăm datele direct și curat din tabelul users
        query = """
            SELECT 
                id, 
                username, 
                full_name, 
                LOWER(TRIM(role)) as role 
            FROM users 
            ORDER BY created_at DESC
        """
        cur.execute(query)
        users = cur.fetchall()
        return jsonify(users)
    except Exception as e:
        print(f"Eroare API utilizatori: {e}")
        return jsonify([]), 500
    finally:
        cur.close()
        conn.close()
        
        

@app.route('/api/update_user_role', methods=['POST'])
def update_user_role():
    # Verificăm dacă cel care face cererea este Owner
    if session.get('role') != 'owner':
        return jsonify({"status": "error", "message": "Doar Owner-ul poate promova alți Owneri!"}), 403

    data = request.json
    user_id = data.get('id')
    new_role = data.get('role').lower()
    
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Actualizăm DOAR în tabelul users (tabelul employees nu există în DB-ul tău)
        cur.execute("UPDATE users SET role = %s WHERE id = %s", (new_role, user_id))
        
        conn.commit()
        return jsonify({"status": "success", "message": f"Utilizator actualizat la {new_role}!"})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()


@app.route('/api/user/approve/<int:target_user_id>', methods=['POST'])
def approve_user(target_user_id):
    # Verificăm dacă cel logat are voie (Owner sau Admin)
    if session.get('role') not in ['owner', 'admin']:
        return jsonify({"status": "error", "message": "Acces interzis!"}), 403

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Adminul/Ownerul aprobă un pending -> devine operator
        cur.execute("UPDATE users SET role = 'operator' WHERE id = %s AND role = 'pending'", (target_user_id,))
        conn.commit()
        return jsonify({"status": "success", "message": "Utilizator aprobat!"})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/user/promote/<int:target_user_id>', methods=['POST'])
def promote_to_admin(target_user_id):
    # DOAR Ownerul poate promova pe cineva la Admin
    if session.get('role') != 'owner':
        return jsonify({"status": "error", "message": "Doar Owner-ul poate promova admini!"}), 403

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE users SET role = 'admin' WHERE id = %s", (target_user_id,))
        conn.commit()
        return jsonify({"status": "success", "message": "Utilizator promovat la Admin!"})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        conn.close()
        

@app.route('/api/current_user_role')
def get_current_user_role():
    return jsonify({
        "role": session.get('role', 'guest'),
        "username": session.get('username')
    })
@app.route('/api/get_current_session')
def get_current_session():
    return jsonify({
        "logged_in": 'id' in session,
        "role": session.get('role', 'guest')
    })


@app.route('/produse_btn')
def produse_btn():
    conn = get_db_connection()
    if not conn: 
        return "Eroare la baza de date!"
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # 1. Luăm produsele cu stocul calculat
    query_products = """
        SELECT p.id, p.name, p.sku, p.price, p.stock_min, c.name as categorie_nume,
        (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
         COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0)) as stock
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.id DESC;
    """
    cur.execute(query_products)
    all_products = cur.fetchall()
    
    # 2. Luăm TOATE categoriile pentru butoanele de sus
    cur.execute("SELECT id, name FROM categories ORDER BY name ASC;")
    all_categories = cur.fetchall()
    
    cur.close()
    conn.close()
    
    # Trimitem AMBELE liste către HTML
    return render_template('produse.html', products=all_products, categories=all_categories)


@app.route('/api/produse/categorie/<int:cat_id>')
def produse_per_categorie(cat_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Am adăugat p.sku în SELECT
    query = """
        SELECT 
            p.sku, 
            p.name, 
            p.price, 
            (COALESCE((SELECT SUM(quantity) FROM stock_entries WHERE product_id = p.id), 0) - 
             COALESCE((SELECT SUM(quantity) FROM stock_exits WHERE product_id = p.id), 0)) as stock
        FROM products p
        WHERE p.category_id = %s
        ORDER BY p.name ASC;
    """
    cur.execute(query, (cat_id,))
    produse = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(produse)

@app.route('/api/categorii/add', methods=['POST'])
def add_category():
    data = request.get_json()
    name = data.get('name')

    if not name:
        return jsonify({"success": False, "message": "Numele este obligatoriu"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Verificăm dacă mai există (opțional)
        cur.execute("INSERT INTO categories (name) VALUES (%s) RETURNING id", (name,))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()
        
@app.route('/api/categorii/delete/<int:cat_id>', methods=['DELETE'])
def delete_category(cat_id):
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # 1. Ștergem produsele din acea categorie (pentru a evita erori de integritate)
        cur.execute("DELETE FROM products WHERE category_id = %s", (cat_id,))
        
        # 2. Ștergem categoria
        cur.execute("DELETE FROM categories WHERE id = %s", (cat_id,))
        
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/receptii/add', methods=['POST'])
def add_reception():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Calculăm prețul total: cantitate * pret_produs
        pret_total = float(data['cantitate']) * float(data['pret_produs'])
        
        query = """
            INSERT INTO receptii (nume_companie, nume_produs, cantitate, pret_produs, pret_total, email_firma, adresa_firma)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        cur.execute(query, (
            data['nume_companie'],
            data['nume_produs'],
            data['cantitate'],
            data['pret_produs'],
            pret_total,
            data['email_firma'],
            data['adresa_firma']
        ))
        
        conn.commit()
        return jsonify({"success": True, "message": "Recepție salvată cu succes!"})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()
        
@app.route('/api/receptii/list', methods=['GET'])
def get_receptions():

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:

        cur.execute("SELECT * FROM receptii ORDER BY id DESC")

        receptii = cur.fetchall()

        return jsonify({"success": True, "data": receptii})

    except Exception as e:

        return jsonify({"success": False, "message": str(e)}), 500

    finally:

        cur.close()
        conn.close()

@app.route('/intrari')
def intrari():
    # Aici vei prelua datele din DB (ex: tranzactii de tip intrare)
    return render_template('intrari.html')

@app.route('/iesiri')
def iesiri():
    # Aici vei prelua datele din DB (ex: tranzactii de tip iesire)
    return render_template('iesiri.html')

@app.route('/furnizori')
def furnizori():
    return render_template('furnizori.html')

@app.route('/rapoarte')
def rapoarte():
    return render_template('rapoarte.html')


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
    
 