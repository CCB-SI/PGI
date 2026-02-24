import urllib.request
import urllib.parse
import json

# 1. Login as admin to get token
data = urllib.parse.urlencode({"username": "admin@admin.com", "password": "admin"}).encode('utf-8')
req = urllib.request.Request("http://localhost:8000/api/v1/auth/login", data=data)
response = urllib.request.urlopen(req)
token_data = json.loads(response.read())
access_token = token_data['access_token']

# 2. Create user
user_data = json.dumps({
    "email": "teste@teste.com",
    "password": "123",
    "role": "editor"
}).encode('utf-8')

req2 = urllib.request.Request("http://localhost:8000/api/v1/users/", data=user_data)
req2.add_header('Content-Type', 'application/json')
req2.add_header('Authorization', f'Bearer {access_token}')
try:
    res2 = urllib.request.urlopen(req2)
    print("User creation success:", json.loads(res2.read()))
except Exception as e:
    print("User creation failed:", e)
    if hasattr(e, 'read'):
        print(e.read().decode())
