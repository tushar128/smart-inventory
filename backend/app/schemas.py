from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=6, max_length=72)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ItemBase(BaseModel):
    sku: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=150)
    category: str = Field(default="General", max_length=80)
    quantity: int = Field(default=0, ge=0)
    reorder_level: int = Field(default=10, ge=0)
    unit_price: float = Field(default=0, ge=0)
    location: str | None = Field(default=None, max_length=80)


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    category: str | None = Field(default=None, max_length=80)
    reorder_level: int | None = Field(default=None, ge=0)
    unit_price: float | None = Field(default=None, ge=0)
    location: str | None = Field(default=None, max_length=80)


class ItemOut(ItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    updated_at: datetime | None = None


class ItemList(BaseModel):
    items: list[ItemOut]
    total: int


class StockAdjust(BaseModel):
    change: int = Field(description="Positive to add stock, negative to remove")
    reason: str = Field(min_length=1, max_length=200)


class MovementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    change: int
    reason: str
    created_at: datetime


class Stats(BaseModel):
    total_items: int
    total_units: int
    total_value: float
    low_stock_count: int
