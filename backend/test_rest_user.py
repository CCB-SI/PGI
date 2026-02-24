import urllib.request
import urllib.parse
import json

# Login
data = urllib.parse.urlencode({"username": "admin@admin.com", "password": "admin"}).encode('utf-8')
req = urllib.request.Request("http://localhost:8000/api/v1/auth/login", data=data)
response = urllib.request.urlopen(req)
token_data = json.loads(response.read())
access_token = token_data['access_token']

# Create another user via API
user_data = json.dumps({
    "email": "teste2@teste.com",
    "password": "senha",
    "role": "editor"
}).encode('utf-8')

req2 = urllib.request.Request("http://localhost:8000/api/v1/users/", data=user_data)
req2.add_header('Content-Type', 'application/json')
req2.add_header('Authorization', f'Bearer {access_token}')
try:
    res2 = urllib.request.urlopen(req2)
    print("REST User creation success:", json.loads(res2.read()))
except Exception as e:
    print("REST User creation failed:", e)
    if hasattr(e, 'read'):
        print(e.read().decode())
