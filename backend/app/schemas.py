from datetime import date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field, field_validator


class Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ProductInput(BaseModel):
    sku: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=180)
    category: str = Field(default="General", max_length=100)
    cost_price: Decimal = Field(default=Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    sale_price: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    stock: int = Field(default=0, ge=0)
    min_stock: int = Field(default=5, ge=0)

    @field_validator("sku", "name")
    @classmethod
    def strip_required(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("No puede estar vacío")
        return v


class ProductOut(ProductInput, Out):
    id: int
    active: bool


class PersonInput(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    email: str | None = Field(default=None, max_length=180)
    phone: str | None = Field(default=None, max_length=40)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Nombre requerido")
        return v


class CustomerInput(PersonInput):
    notes: str | None = None


class CustomerOut(CustomerInput, Out):
    id: int
    active: bool


class SellerOut(PersonInput, Out):
    id: int
    active: bool


class SaleItemInput(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0)
    unit_price: Decimal | None = Field(default=None, ge=0, max_digits=14, decimal_places=2)


class SaleInput(BaseModel):
    sale_date: date
    customer_id: int = Field(gt=0)
    seller_id: int = Field(gt=0)
    notes: str | None = None
    items: list[SaleItemInput] = Field(min_length=1)


class SaleItemOut(Out):
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: Decimal
    unit_cost: Decimal
    subtotal: Decimal


class SaleOut(Out):
    id: int
    sale_date: date
    customer_id: int
    seller_id: int
    customer_name: str
    seller_name: str
    total: Decimal
    cost_total: Decimal
    status: str
    notes: str | None
    items: list[SaleItemOut]


class ExpenseInput(BaseModel):
    expense_date: date
    description: str = Field(min_length=1, max_length=200)
    category: str = Field(default="Operación", max_length=100)
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)


class ExpenseOut(ExpenseInput, Out):
    id: int
