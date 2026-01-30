from sqlmodel import create_engine, Session

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/veriyolu"  # şifreyi gerektiği gibi değiştir

engine = create_engine(DATABASE_URL, echo=True)

def get_session():
    with Session(engine) as session:
        yield session
