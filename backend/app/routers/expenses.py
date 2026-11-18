from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Expense
from ..schemas import ExpenseInput, ExpenseOut

router = APIRouter(prefix="/expenses", tags=["Gastos"])


@router.get("", response_model=list[ExpenseOut])
def list_expenses(db: Session = Depends(get_db)):
    return db.scalars(select(Expense).order_by(Expense.expense_date.desc(), Expense.id.desc()).limit(500)).all()


@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(payload: ExpenseInput, db: Session = Depends(get_db)):
    row = Expense(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/{ident}", response_model=ExpenseOut)
def edit_expense(ident: int, payload: ExpenseInput, db: Session = Depends(get_db)):
    row = db.get(Expense, ident)
    if not row:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{ident}")
def delete_expense(ident: int, db: Session = Depends(get_db)):
    row = db.get(Expense, ident)
    if not row:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    db.delete(row)
    db.commit()
    return {"message": "Gasto eliminado"}
