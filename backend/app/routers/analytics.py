from datetime import date, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Customer, Product, Sale, SaleItem, Seller, Expense

router = APIRouter(tags=["Dashboard y reportes"])


def valid_range(start: date, end: date):
    if start > end:
        raise HTTPException(status_code=422, detail="La fecha inicial no puede ser posterior a la final")


def money(value) -> Decimal:
    return value or Decimal("0.00")


@router.get("/dashboard/summary")
def dashboard(start: date = Query(...), end: date = Query(...), db: Session = Depends(get_db)):
    valid_range(start, end)
    sales_stmt = select(
        func.coalesce(func.sum(Sale.total), 0),
        func.coalesce(func.sum(Sale.cost_total), 0),
        func.count(Sale.id),
    ).where(Sale.status == "completed", Sale.sale_date.between(start, end))
    revenue, cost_of_goods, sale_count = db.execute(sales_stmt).one()
    expense_total = db.scalar(select(func.coalesce(func.sum(Expense.amount), 0)).where(Expense.expense_date.between(start, end)))
    revenue, cost_of_goods, expense_total = map(money, (revenue, cost_of_goods, expense_total))
    gross_profit = revenue - cost_of_goods
    net_profit = gross_profit - expense_total

    daily_rows = db.execute(
        select(Sale.sale_date, func.sum(Sale.total)).where(
            Sale.status == "completed", Sale.sale_date.between(start, end)
        ).group_by(Sale.sale_date).order_by(Sale.sale_date)
    ).all()
    by_day = {d.isoformat(): float(amount) for d, amount in daily_rows}
    chart = []
    # No devolver miles de puntos en rangos muy grandes.
    span = (end - start).days + 1
    if span <= 366:
        for offset in range(span):
            d = start + timedelta(days=offset)
            chart.append({"date": d.isoformat(), "sales": by_day.get(d.isoformat(), 0)})
    else:
        chart = [{"date": day, "sales": value} for day, value in by_day.items()]

    seller_rows = db.execute(
        select(Seller.id, Seller.name, func.count(Sale.id), func.coalesce(func.sum(Sale.total), 0))
        .join(Sale, Sale.seller_id == Seller.id)
        .where(Sale.status == "completed", Sale.sale_date.between(start, end))
        .group_by(Seller.id, Seller.name)
        .order_by(func.sum(Sale.total).desc())
    ).all()
    low_stock = db.scalars(select(Product).where(Product.active.is_(True), Product.stock <= Product.min_stock).order_by(Product.stock.asc()).limit(8)).all()
    return {
        "period": {"start": start, "end": end},
        "revenue": revenue, "cost_of_goods": cost_of_goods,
        "expenses": expense_total, "gross_profit": gross_profit,
        "net_profit": net_profit, "sale_count": sale_count,
        "active_products": db.scalar(select(func.count()).select_from(Product).where(Product.active.is_(True))),
        "active_customers": db.scalar(select(func.count()).select_from(Customer).where(Customer.active.is_(True))),
        "active_sellers": db.scalar(select(func.count()).select_from(Seller).where(Seller.active.is_(True))),
        "chart": chart,
        "top_sellers": [{"id": ident, "name": name, "sales_count": count, "revenue": total} for ident, name, count, total in seller_rows],
        "low_stock": [{"id": p.id, "name": p.name, "sku": p.sku, "stock": p.stock, "min_stock": p.min_stock} for p in low_stock],
    }


@router.get("/reports/sales")
def sales_report(
    start: date = Query(...), end: date = Query(...), seller_id: int | None = None,
    db: Session = Depends(get_db),
):
    valid_range(start, end)
    stmt = (
        select(Sale.id, Sale.sale_date, Seller.name, Customer.name, Sale.total, Sale.cost_total, Sale.status)
        .join(Seller, Seller.id == Sale.seller_id)
        .join(Customer, Customer.id == Sale.customer_id)
        .where(Sale.sale_date.between(start, end))
        .order_by(Sale.sale_date.desc(), Sale.id.desc())
        .limit(2000)
    )
    if seller_id:
        stmt = stmt.where(Sale.seller_id == seller_id)
    rows = db.execute(stmt).all()
    return [{
        "id": row[0], "date": row[1], "seller": row[2], "customer": row[3],
        "total": row[4], "cost_total": row[5], "gross_profit": row[4] - row[5], "status": row[6],
    } for row in rows]
