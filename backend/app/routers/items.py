from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/items", tags=["Inventory"], dependencies=[Depends(get_current_user)])


def _get_item(db: Session, item_id: int) -> models.Item:
    item = db.get(models.Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.get("", response_model=schemas.ItemList)
def list_items(
    q: str | None = Query(None, description="Search by name or SKU"),
    category: str | None = None,
    low_stock: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(models.Item)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(models.Item.name.ilike(like), models.Item.sku.ilike(like)))
    if category:
        query = query.filter(models.Item.category == category)
    if low_stock:
        query = query.filter(models.Item.quantity <= models.Item.reorder_level)
    total = query.count()
    items = query.order_by(models.Item.name).offset(skip).limit(limit).all()
    return {"items": items, "total": total}


@router.get("/stats", response_model=schemas.Stats)
def stats(db: Session = Depends(get_db)):
    I = models.Item
    return {
        "total_items": db.query(func.count(I.id)).scalar(),
        "total_units": int(db.query(func.coalesce(func.sum(I.quantity), 0)).scalar()),
        "total_value": float(db.query(func.coalesce(func.sum(I.quantity * I.unit_price), 0)).scalar()),
        "low_stock_count": db.query(func.count(I.id)).filter(I.quantity <= I.reorder_level).scalar(),
    }


@router.get("/categories", response_model=list[str])
def categories(db: Session = Depends(get_db)):
    rows = db.query(models.Item.category).distinct().order_by(models.Item.category).all()
    return [r[0] for r in rows]


@router.post("", response_model=schemas.ItemOut, status_code=status.HTTP_201_CREATED)
def create_item(
    data: schemas.ItemCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if db.query(models.Item).filter(models.Item.sku == data.sku).first():
        raise HTTPException(status_code=400, detail=f"SKU '{data.sku}' already exists")
    item = models.Item(**data.model_dump())
    db.add(item)
    db.flush()
    if item.quantity > 0:
        db.add(models.StockMovement(item_id=item.id, user_id=user.id, change=item.quantity, reason="Opening stock"))
    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}", response_model=schemas.ItemOut)
def get_item(item_id: int, db: Session = Depends(get_db)):
    return _get_item(db, item_id)


@router.put("/{item_id}", response_model=schemas.ItemOut)
def update_item(item_id: int, data: schemas.ItemUpdate, db: Session = Depends(get_db)):
    item = _get_item(db, item_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    db.delete(_get_item(db, item_id))
    db.commit()


@router.post("/{item_id}/adjust", response_model=schemas.ItemOut)
def adjust_stock(
    item_id: int,
    data: schemas.StockAdjust,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if data.change == 0:
        raise HTTPException(status_code=400, detail="Change must not be zero")
    item = _get_item(db, item_id)
    if item.quantity + data.change < 0:
        raise HTTPException(status_code=400, detail=f"Only {item.quantity} in stock; cannot remove {abs(data.change)}")
    item.quantity += data.change
    db.add(models.StockMovement(item_id=item.id, user_id=user.id, change=data.change, reason=data.reason))
    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}/movements", response_model=list[schemas.MovementOut])
def movements(item_id: int, db: Session = Depends(get_db)):
    return _get_item(db, item_id).movements
