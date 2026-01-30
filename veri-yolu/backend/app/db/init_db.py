from sqlmodel import SQLModel, Session
from app.models.user import User, RoleEnum
from app.models.category import Category
from app.models.topic import Topic
from app.models.image import Image
from app.db.session import engine
from app.models.contact_message import ContactMessage  # ensure table creation
from app.core.security import hash_password
from app.models.annotation import Annotation
from app.models.discussion import Forum, DiscussionThread, DiscussionPost, DiscussionPostVote
from app.models.password_reset import PasswordResetToken  # ensure table

def init_db():
    # Create tables if they don't exist
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # Kullanıcılar
        if not session.query(User).filter(User.email == "annotator@veriyolu.com").first():
            annotator = User(
                email="annotator@veriyolu.com",
                hashed_password=hash_password("annotator123"),
                is_verified=True,
                role=RoleEnum.annotator
            )
            session.add(annotator)
        else:
            annotator = session.query(User).filter(User.email == "annotator@veriyolu.com").first()

        if not session.query(User).filter(User.email == "user@veriyolu.com").first():
            user1 = User(
                email="user@veriyolu.com",
                hashed_password=hash_password("user123"),
                is_verified=True,
                role=RoleEnum.user
            )
            session.add(user1)
        else:
            user1 = session.query(User).filter(User.email == "user@veriyolu.com").first()

        # Admin kullanıcı
        if not session.query(User).filter(User.email == "admin@veriyolu.com").first():
            admin_user = User(
                email="admin@veriyolu.com",
                hashed_password=hash_password("admin123"),
                is_verified=True,
                role=RoleEnum.admin
            )
            session.add(admin_user)
        else:
            admin_user = session.query(User).filter(User.email == "admin@veriyolu.com").first()
        session.commit()
        admin_user = session.query(User).filter(User.email == "admin@veriyolu.com").first()
        annotator = session.query(User).filter(User.email == "annotator@veriyolu.com").first()
        user1 = session.query(User).filter(User.email == "user@veriyolu.com").first()

        # Kategoriler
        if not session.query(Category).filter(Category.name_tr == "Hayvanlar").first():
            cat1 = Category(name_tr="Hayvanlar", name_en="Animals")
            session.add(cat1)
        else:
            cat1 = session.query(Category).filter(Category.name_tr == "Hayvanlar").first()
        if not session.query(Category).filter(Category.name_tr == "Araçlar").first():
            cat2 = Category(name_tr="Araçlar", name_en="Vehicles")
            session.add(cat2)
        else:
            cat2 = session.query(Category).filter(Category.name_tr == "Araçlar").first()
        session.commit()
        cat1 = session.query(Category).filter(Category.name_tr == "Hayvanlar").first()
        cat2 = session.query(Category).filter(Category.name_tr == "Araçlar").first()

        # Topicler
        import json
        if not session.query(Topic).filter(Topic.title == "Köpekler").first():
            topic1 = Topic(
                title="Köpekler",
                description="Köpek resimleri",
                category_id=cat1.id,
                owner_id=admin_user.id,
                candidate_labels=json.dumps(["dog", "puppy", "canine"])
            )
            session.add(topic1)
        else:
            topic1 = session.query(Topic).filter(Topic.title == "Köpekler").first()
        if not session.query(Topic).filter(Topic.title == "Arabalar").first():
            topic2 = Topic(
                title="Arabalar",
                description="Araba resimleri",
                category_id=cat2.id,
                owner_id=annotator.id,
                candidate_labels=json.dumps(["car", "automobile", "vehicle"])
            )
            session.add(topic2)
        else:
            topic2 = session.query(Topic).filter(Topic.title == "Arabalar").first()
        session.commit()
        topic1 = session.query(Topic).filter(Topic.title == "Köpekler").first()
        topic2 = session.query(Topic).filter(Topic.title == "Arabalar").first()

        # Forums - global
        if not session.query(Forum).first():
            general = Forum(name="Genel", description="Duyurular, kaynaklar ve ilginç konuşmalar")
            newcomers = Forum(name="Yeni Başlayanlar", description="Yeni üyeler için ilk durak")
            session.add(general)
            session.add(newcomers)
            session.commit()

        # Forums - per topic
        def ensure_topic_forum(t: Topic):
            forum_name = f"{t.title} Tartışmaları"
            forum = session.query(Forum).filter(Forum.name == forum_name).first()
            if not forum:
                forum = Forum(name=forum_name, description=f"'{t.title}' veri seti hakkında konuşmalar")
                session.add(forum)
                session.commit()
            return forum

        forum1 = ensure_topic_forum(topic1)
        forum2 = ensure_topic_forum(topic2)

        # Görseller
        if not session.query(Image).filter(Image.filename == "dog.jpg").first():
            img1 = Image(
                filename="dog.jpg",
                topic_id=topic1.id,
                uploader_id=user1.id,
                is_relevant=True,
                points_awarded=5,
                status="approved",
                ai_score=0.92
            )
            session.add(img1)
        if not session.query(Image).filter(Image.filename == "reism.jpg").first():
            img2 = Image(
                filename="reism.jpg",
                topic_id=topic2.id,
                uploader_id=annotator.id,
                is_relevant=False,
                points_awarded=0,
                status="pending",
                ai_score=0.18
            )
            session.add(img2)
        if not session.query(Image).filter(Image.filename == "EmMgcZ8XIAAJEVB.jpg").first():
            img3 = Image(
                filename="EmMgcZ8XIAAJEVB.jpg",
                topic_id=topic2.id,
                uploader_id=admin_user.id,
                is_relevant=True,
                points_awarded=5,
                status="approved",
                ai_score=0.81
            )
            session.add(img3)
        session.commit()
        img1 = session.query(Image).filter(Image.filename == "dog.jpg").first()
        img2 = session.query(Image).filter(Image.filename == "reism.jpg").first()

        # Annotationlar
        if not session.query(Annotation).first():
            ann1 = Annotation(
                label="dog",
                x=0.1, y=0.2, width=0.5, height=0.5,
                image_id=img1.id,
                category_id=cat1.id
            )
            ann2 = Annotation(
                label="car",
                x=0.3, y=0.4, width=0.2, height=0.2,
                image_id=img2.id,
                category_id=cat2.id
            )
            session.add(ann1)
            session.add(ann2)
        session.commit()

        # Seed example threads/posts for per-topic forums
        def ensure_thread(forum: Forum, topic: Topic, title: str, author_id: int, content: str):
            existing = session.query(DiscussionThread).filter(
                DiscussionThread.forum_id == forum.id,
                DiscussionThread.title == title,
            ).first()
            if existing:
                return existing
            thr = DiscussionThread(forum_id=forum.id, topic_id=topic.id, title=title, author_id=author_id)
            session.add(thr)
            session.commit()
            pst = DiscussionPost(thread_id=thr.id, author_id=author_id, content=content)
            session.add(pst)
            session.commit()
            return thr

        ensure_thread(
            forum1,
            topic1,
            "Köpekler veri seti üzerine genel tartışma",
            admin_user.id,
            "Bu veri setini nasıl genişletebiliriz? Önerilerinizi paylaşın."
        )
        ensure_thread(
            forum2,
            topic2,
            "Arabalar veri seti - kategori önerileri",
            annotator.id,
            "Hangi alt kategoriler eklenmeli?"
        )
