from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(120), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True)
    sku = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), index=True, nullable=False)
    category = Column(String(80), index=True, nullable=False, default="General")
    quantity = Column(Integer, nullable=False, default=0)
    reorder_level = Column(Integer, nullable=False, default=10)
    unit_price = Column(Numeric(10, 2), nullable=False, default=0)
    location = Column(String(80), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    movements = relationship(
        "StockMovement", back_populates="item", cascade="all, delete-orphan",
        order_by="StockMovement.created_at.desc()",
    )


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    change = Column(Integer, nullable=False)
    reason = Column(String(200), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    item = relationship("Item", back_populates="movements")
