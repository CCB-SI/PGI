import sqlite3
import bcrypt

conn = sqlite3.connect('gestao.db')
cursor = conn.cursor()
cursor.execute("SELECT id, email, password_hash, role FROM users")
users = cursor.fetchall()
print("USERS IN DB:")
for u in users:
    print(u)
    
    # Let's test checking the hash
    if u[1] == 'teste@teste.com':
        try:
            valid = bcrypt.checkpw('123456'.encode('utf-8'), u[2].encode('utf-8'))
            print(f"Bcrypt check for teste@teste.com with '123456': {valid}")
        except Exception as e:
            print(f"Bcrypt validation error: {e}")
