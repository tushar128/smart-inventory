"""Optional: python seed.py  -> creates a demo user and sample items."""
from app.database import Base, SessionLocal, engine
from app import models
from app.security import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

if not db.query(models.User).filter_by(email="admin@demo.com").first():
    db.add(models.User(email="admin@demo.com", full_name="Demo Admin", hashed_password=hash_password("admin123")))

samples = [
    ("KB-001", "Mechanical Keyboard", "Peripherals", 42, 10, 59.99, "A1-03"),
    ("MS-014", "Wireless Mouse", "Peripherals", 6, 15, 24.50, "A1-04"),
    ("MN-270", "27-inch Monitor", "Displays", 18, 5, 219.00, "B2-01"),
    ("CB-HDMI", "HDMI Cable 2m", "Cables", 3, 25, 7.99, "C3-12"),
    ("SSD-1T", "1TB NVMe SSD", "Storage", 30, 8, 89.00, "D1-02"),
]
for sku, name, cat, qty, rl, price, loc in samples:
    if not db.query(models.Item).filter_by(sku=sku).first():
        db.add(models.Item(sku=sku, name=name, category=cat, quantity=qty, reorder_level=rl, unit_price=price, location=loc))
db.commit()
print("Seeded. Login: admin@demo.com / admin123")
