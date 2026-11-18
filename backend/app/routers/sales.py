from collections import Counter
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from ..database import get_db
from ..models import Customer, Product, Sale, SaleItem, Seller
from ..schemas import SaleInput, SaleOut

router = APIRouter(prefix="/sales", tags=["Ventas"])


def serialize_sale(sale: Sale) -> dict:
    return {
        "id": sale.id,
        "sale_date": sale.sale_date,
        "customer_id": sale.customer_id,
        "seller_id": sale.seller_id,
        "customer_name": sale.customer.name,
        "seller_name": sale.seller.name,
        "total": sale.total,
        "cost_total": sale.cost_total,
        "status": sale.status,
        "notes": sale.notes,
        "items": sale.items,
    }


def get_sale(db: Session, ident: int) -> Sale:
    row = db.scalar(
        select(Sale).where(Sale.id == ident).options(
            selectinload(Sale.items), selectinload(Sale.customer), selectinload(Sale.seller)
        )
    )
    if not row:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    return row


@router.get("", response_model=list[SaleOut])
def list_sales(db: Session = Depends(get_db)):
    stmt = select(Sale).options(
        selectinload(Sale.items), selectinload(Sale.customer), selectinload(Sale.seller)
    ).order_by(Sale.sale_date.desc(), Sale.id.desc()).limit(500)
    return [serialize_sale(s) for s in db.scalars(stmt).all()]


@router.post("", response_model=SaleOut, status_code=status.HTTP_201_CREATED)
def create_sale(payload: SaleInput, db: Session = Depends(get_db)):
    try:
        customer = db.get(Customer, payload.customer_id)
        seller = db.get(Seller, payload.seller_id)
        if not customer or not customer.active:
            raise HTTPException(status_code=422, detail="Cliente no disponible")
        if not seller or not seller.active:
            raise HTTPException(status_code=422, detail="Vendedor no disponible")
        quantities = Counter()
        for item in payload.items:
            quantities[item.product_id] += item.quantity
        # Bloqueo transaccional para evitar ventas simultáneas por encima del inventario.
        products = {}
        for product_id in sorted(quantities):
            product = db.scalar(select(Product).where(Product.id == product_id).with_for_update())
            if not product or not product.active:
                raise HTTPException(status_code=422, detail=f"Producto {product_id} no disponible")
            if product.stock < quantities[product_id]:
                raise HTTPException(status_code=409, detail=f"Stock insuficiente para {product.name}: quedan {product.stock}")
            products[product_id] = product

        sale = Sale(
            sale_date=payload.sale_date, customer_id=payload.customer_id,
            seller_id=payload.seller_id, notes=payload.notes, total=Decimal("0"),
            cost_total=Decimal("0"), status="completed",
        )
        db.add(sale)
        db.flush()
        total, cost_total = Decimal("0"), Decimal("0")
        for line in payload.items:
            product = products[line.product_id]
            price = line.unit_price if line.unit_price is not None else product.sale_price
            subtotal = price * line.quantity
            total += subtotal
            cost_total += product.cost_price * line.quantity
            db.add(SaleItem(
                sale_id=sale.id, product_id=product.id, product_name=product.name,
                quantity=line.quantity, unit_price=price, unit_cost=product.cost_price,
                subtotal=subtotal,
            ))
        for product_id, quantity in quantities.items():
            products[product_id].stock -= quantity
        sale.total = total
        sale.cost_total = cost_total
        db.commit()
        return serialize_sale(get_sale(db, sale.id))
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise


@router.post("/{ident}/cancel", response_model=SaleOut)
def cancel_sale(ident: int, db: Session = Depends(get_db)):
    try:
        sale = db.scalar(select(Sale).where(Sale.id == ident).with_for_update())
        if not sale:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        if sale.status == "cancelled":
            raise HTTPException(status_code=409, detail="La venta ya fue anulada")
        # Bloqueamos productos por orden estable.
        items = db.scalars(select(SaleItem).where(SaleItem.sale_id == ident)).all()
        quantities = Counter()
        for item in items:
            quantities[item.product_id] += item.quantity
        for product_id in sorted(quantities):
            product = db.scalar(select(Product).where(Product.id == product_id).with_for_update())
            product.stock += quantities[product_id]
        sale.status = "cancelled"
        db.commit()
        return serialize_sale(get_sale(db, ident))
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
