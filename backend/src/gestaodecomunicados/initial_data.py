from .core.database import SessionLocal, engine
from .models.all_models import Category, User, Base, Location, Event
from datetime import datetime, timedelta

def init_db():
    db = SessionLocal()
    
    # 1. Categorias
    categories = [
        {"name": "Música", "color": "#003366", "description": "Ensaios e apresentações musicais"},
        {"name": "Cultos", "color": "#E91E63", "description": "Cultos e reuniões religiosas"},
        {"name": "Utilidade Pública", "color": "#FF9800", "description": "Avisos importantes para a comunidade"},
        {"name": "Eventos Jovens", "color": "#4CAF50", "description": "Reuniões da mocidade"},
    ]

    print("Criando categorias...")
    db_categories = {}
    for cat_data in categories:
        exists = db.query(Category).filter(Category.name == cat_data["name"]).first()
        if not exists:
            cat = Category(**cat_data)
            db.add(cat)
            db.commit()
            db.refresh(cat)
            db_categories[cat.name] = cat
        else:
            db_categories[cat_data["name"]] = exists
    
    # 2. Usuário Admin
    print("Criando usuário admin...")
    admin_email = "admin@example.com"
    admin_user = db.query(User).filter(User.email == admin_email).first()
    if not admin_user:
        admin_user = User(email=admin_email, hashed_password="admin", is_admin=True)
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

    # 3. Locais
    print("Criando locais...")
    locations = [
        {
            "name": "Matriz - Suzano", 
            "address": "Rua General Francisco Glicério, 123", 
            "city": "Suzano", 
            "description": "Igreja Central. Administrativa.",
            "service_times": "Domingos 19h • Quartas 19h30",
            "map_url": "https://maps.google.com/?q=Matriz+Suzano"
        },
        {
            "name": "Centro Comunitário Poá", 
            "address": "Av. Brasil, 500", 
            "city": "Poá", 
            "description": "Espaço de eventos municipal",
            "service_times": "Aberto em dias de evento",
            "map_url": "https://maps.google.com/?q=Centro+Comunitario+Poa"
        },
        {
            "name": "Congregação Jardim Imperador", 
            "address": "Rua das Flores, 45", 
            "city": "Suzano", 
            "description": "Igreja Local",
            "service_times": "Domingos 18h • Quintas 19h30",
            "map_url": "https://maps.google.com/?q=Jardim+Imperador+Suzano"
        },
    ]

    db_locations = {}
    for loc_data in locations:
        exists = db.query(Location).filter(Location.name == loc_data["name"]).first()
        if not exists:
            loc = Location(**loc_data)
            db.add(loc)
            db.commit()
            db.refresh(loc)
            db_locations[loc.name] = loc
        else:
            db_locations[loc_data["name"]] = exists

    # 4. Eventos (Seed)
    print("Criando eventos de exemplo...")
    events_data = [
        {
            "title": "Grande Ensaio Regional",
            "description": "Ensaio geral com todos os músicos e coral da região de Suzano. Presença de encarregados regionais.",
            "start_time": datetime.now() + timedelta(days=2, hours=5), # Daqui a 2 dias
            "category_id": db_categories["Música"].id,
            "location_id": db_locations["Matriz - Suzano"].id,
            "owner_id": admin_user.id
        },
        {
            "title": "Vacinação Anual",
            "description": "Campanha de vacinação contra a gripe para idosos acima de 60 anos.",
            "start_time": datetime.now() + timedelta(days=5, hours=2),
            "category_id": db_categories["Utilidade Pública"].id,
            "location_id": db_locations["Centro Comunitário Poá"].id,
            "owner_id": admin_user.id
        },
        {
            "title": "Culto Especial da Mocidade",
            "description": "Reunião para jovens com tema: Tecnologia e Fé.",
            "start_time": datetime.now() + timedelta(days=7, hours=6),
            "category_id": db_categories["Eventos Jovens"].id,
            "location_id": db_locations["Congregação Jardim Imperador"].id,
            "owner_id": admin_user.id
        },
        {
            "title": "Reunião de Pais e Mestres",
            "description": "Reunião semestral para alinhar o ensino musical.",
            "start_time": datetime.now() + timedelta(days=10, hours=4),
            "category_id": db_categories["Música"].id,
            "location_id": db_locations["Matriz - Suzano"].id,
            "owner_id": admin_user.id
        }
    ]

    for event_data in events_data:
        # Verifica se evento similar já existe (simplificado)
        exists = db.query(Event).filter(Event.title == event_data["title"]).first()
        if not exists:
            event = Event(**event_data)
            db.add(event)
    
    db.commit()
    print("Banco de dados populado com sucesso! 🚀")
    db.close()

if __name__ == "__main__":
    # Garante que as tabelas existem
    Base.metadata.create_all(bind=engine)
    init_db()
