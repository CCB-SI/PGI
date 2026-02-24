from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ....core.database import get_db
from ....core.security import get_password_hash
from ....models.all_models import User
from ....schemas.all_schemas import UserOut, UserCreate, UserBase
from .. import auth

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=List[UserOut])
def read_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.require_admin)
):
    """
    Lista todos os usuários do sistema. Apenas admins podem acessar.
    """
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    user: UserCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.require_admin)
):
    """
    Cria um novo usuário (admin ou editor). Apenas admins podem criar.
    """
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="E-mail já registrado")
        
    hashed_password = get_password_hash(user.password)
    
    # Previne criação com role inválida. Fallback para 'editor'
    role = user.role if user.role in ['admin', 'editor'] else 'editor'

    new_user = User(
        email=user.email,
        password_hash=hashed_password,
        role=role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.require_admin)
):
    """
    Deleta um usuário. Apenas admins podem deletar. Impede auto-exclusão acidental se for o único admin.
    """
    user_to_delete = db.query(User).filter(User.id == user_id).first()
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    if user_to_delete.id == current_user.id:
        raise HTTPException(status_code=400, detail="Você não pode excluir a sua própria conta atualmente em uso.")
        
    db.delete(user_to_delete)
    db.commit()
    return None
