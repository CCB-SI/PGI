import sqlite3
import os

db_path = "/app/data/gestaodecomunicados.db"
# Fallback for local testing if not in docker
if not os.path.exists(db_path):
    db_path = "./backend/gestaodecomunicados.db"

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check columns in resources
    cursor.execute("PRAGMA table_info(resources)")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"Current columns in 'resources': {columns}")
    
    if 'category_id' not in columns:
        print("Adding 'category_id' column to 'resources'...")
        cursor.execute("ALTER TABLE resources ADD COLUMN category_id INTEGER REFERENCES download_categories(id)")
        conn.commit()
        print("Column added successfully.")
    else:
        print("'category_id' already exists.")
        
    conn.close()
else:
    print(f"Database not found at {db_path}")
