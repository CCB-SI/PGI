import sys
import os

# Ensure we're in the right directory context for imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from src.gestaodecomunicados.core.database import SessionLocal
from src.gestaodecomunicados.models.auth_model import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = SessionLocal()

email = "ministerio@regional.com"
password = "pgri"

existing = db.query(User).filter(User.email == email).first()

if not existing:
    hashed_password = pwd_context.hash(password)
    new_user = User(
        email=email,
        hashed_password=hashed_password,
        role="editor"
    )
    db.add(new_user)
    db.commit()
    print(f"User {email} created successfully with password {password}")
else:
    print(f"User {email} already exists")

db.close()
