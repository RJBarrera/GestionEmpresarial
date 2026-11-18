from typing import Type
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Product, Customer, Seller
from ..schemas import ProductInput, ProductOut, CustomerInput, CustomerOut, PersonInput, SellerOut

router = APIRouter(tags=["Catálogos"])


def _all(db: Session, model: type, include_inactive: bool = False):
    stmt = select(model).order_by(model.id.desc())
    if not include_inactive:
        stmt = stmt.where(model.active.is_(True))
    return db.scalars(stmt).all()


def _get(db: Session, model: type, ident: int):
    row = db.get(model, ident)
    if row is None or not row.active:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    return row


def _save(db: Session, model: type, payload, row=None):
    if row is None:
        row = model(**payload.model_dump())
        db.add(row)
    else:
        for key, value in payload.model_dump().items():
            setattr(row, key, value)
    try:
        db.commit()
        db.refresh(row)
        return row
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Dato duplicado o conflicto de integridad")


def _restore(db: Session, model: type, ident: int):
    row = db.get(model, ident)
    if row is None:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    row.active = True
    db.commit()
    return {"message": "Registro reactivado correctamente"}


def _deactivate(db: Session, model: type, ident: int):
    row = _get(db, model, ident)
    row.active = False  # No elimina ventas históricas ni sus referencias.
    db.commit()
    return {"message": "Registro desactivado correctamente"}


@router.get("/products", response_model=list[ProductOut])
def list_products(include_inactive: bool = False, db: Session = Depends(get_db)):
    return _all(db, Product, include_inactive)


@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductInput, db: Session = Depends(get_db)):
    return _save(db, Product, payload)


@router.put("/products/{ident}", response_model=ProductOut)
def update_product(ident: int, payload: ProductInput, db: Session = Depends(get_db)):
    return _save(db, Product, payload, _get(db, Product, ident))


@router.delete("/products/{ident}")
def delete_product(ident: int, db: Session = Depends(get_db)):
    return _deactivate(db, Product, ident)


@router.get("/customers", response_model=list[CustomerOut])
def list_customers(include_inactive: bool = False, db: Session = Depends(get_db)):
    return _all(db, Customer, include_inactive)


@router.post("/customers", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerInput, db: Session = Depends(get_db)):
    return _save(db, Customer, payload)


@router.put("/customers/{ident}", response_model=CustomerOut)
def update_customer(ident: int, payload: CustomerInput, db: Session = Depends(get_db)):
    return _save(db, Customer, payload, _get(db, Customer, ident))


@router.delete("/customers/{ident}")
def delete_customer(ident: int, db: Session = Depends(get_db)):
    return _deactivate(db, Customer, ident)


@router.get("/sellers", response_model=list[SellerOut])
def list_sellers(include_inactive: bool = False, db: Session = Depends(get_db)):
    return _all(db, Seller, include_inactive)


@router.post("/sellers", response_model=SellerOut, status_code=status.HTTP_201_CREATED)
def create_seller(payload: PersonInput, db: Session = Depends(get_db)):
    return _save(db, Seller, payload)


@router.put("/sellers/{ident}", response_model=SellerOut)
def update_seller(ident: int, payload: PersonInput, db: Session = Depends(get_db)):
    return _save(db, Seller, payload, _get(db, Seller, ident))


@router.delete("/sellers/{ident}")
def delete_seller(ident: int, db: Session = Depends(get_db)):
    return _deactivate(db, Seller, ident)


@router.patch("/products/{ident}/restore")
def restore_product(ident: int, db: Session = Depends(get_db)):
    return _restore(db, Product, ident)


@router.patch("/customers/{ident}/restore")
def restore_customer(ident: int, db: Session = Depends(get_db)):
    return _restore(db, Customer, ident)


@router.patch("/sellers/{ident}/restore")
def restore_seller(ident: int, db: Session = Depends(get_db)):
    return _restore(db, Seller, ident)
