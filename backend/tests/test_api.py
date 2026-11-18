"""Pruebas funcionales de API con SQLite temporal. No modifican PostgreSQL."""
import os
import tempfile
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{Path(tempfile.mkdtemp()) / 'test.db'}"
from app.database import Base, engine  # noqa: E402
from app import models  # noqa: F401,E402
from app.main import app  # noqa: E402


@pytest.fixture
def client():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with TestClient(app) as client:
        yield client


def add_basics(client):
    product = client.post("/api/products", json={
        "sku": "SKU-001", "name": "Artículo de prueba", "sale_price": "150.00",
        "cost_price": "70.00", "stock": 4, "min_stock": 1,
    })
    assert product.status_code == 201, product.text
    customer = client.post("/api/customers", json={"name": "Cliente de prueba"})
    seller = client.post("/api/sellers", json={"name": "Vendedor de prueba"})
    assert customer.status_code == 201 and seller.status_code == 201
    return product.json()["id"], customer.json()["id"], seller.json()["id"]


def test_complete_sale_expense_dashboard_and_cancel(client):
    product_id, customer_id, seller_id = add_basics(client)
    payload = {
        "sale_date": "2026-11-16", "customer_id": customer_id,
        "seller_id": seller_id, "items": [{"product_id": product_id, "quantity": 2}],
    }
    sale = client.post("/api/sales", json=payload)
    assert sale.status_code == 201, sale.text
    assert sale.json()["total"] == "300.00"
    assert sale.json()["cost_total"] == "140.00"
    assert client.get("/api/products").json()[0]["stock"] == 2
    assert client.post("/api/expenses", json={
        "expense_date": "2026-11-16", "description": "Servicios", "amount": "25.00"
    }).status_code == 201
    dashboard = client.get("/api/dashboard/summary?start=2026-11-01&end=2026-11-30").json()
    assert dashboard["revenue"] == 300
    assert dashboard["cost_of_goods"] == 140
    assert dashboard["expenses"] == 25
    assert dashboard["net_profit"] == 135
    assert dashboard["top_sellers"][0]["id"] == seller_id
    report = client.get("/api/reports/sales?start=2026-11-01&end=2026-11-30&seller_id=1")
    assert report.status_code == 200
    assert len(report.json()) == 1
    assert client.post(f"/api/sales/{sale.json()['id']}/cancel").status_code == 200
    assert client.get("/api/products").json()[0]["stock"] == 4
    after = client.get("/api/dashboard/summary?start=2026-11-01&end=2026-11-30").json()
    assert after["revenue"] == 0
    assert after["net_profit"] == -25
    assert client.post(f"/api/sales/{sale.json()['id']}/cancel").status_code == 409


def test_insufficient_stock_rolls_back_and_duplicate_sku(client):
    product_id, customer_id, seller_id = add_basics(client)
    result = client.post("/api/sales", json={
        "sale_date": "2026-11-16", "customer_id": customer_id, "seller_id": seller_id,
        "items": [{"product_id": product_id, "quantity": 3}, {"product_id": product_id, "quantity": 2}],
    })
    assert result.status_code == 409
    assert client.get("/api/products").json()[0]["stock"] == 4
    assert client.get("/api/sales").json() == []
    duplicate = client.post("/api/products", json={"sku": "SKU-001", "name": "Otro", "sale_price": "12.00"})
    assert duplicate.status_code == 409
    assert client.get("/api/dashboard/summary?start=2026-11-30&end=2026-11-01").status_code == 422


def test_soft_deletion_preserves_sale_history(client):
    product_id, customer_id, seller_id = add_basics(client)
    sale = client.post("/api/sales", json={
        "sale_date": "2026-11-16", "customer_id": customer_id,
        "seller_id": seller_id, "items": [{"product_id": product_id, "quantity": 1}],
    })
    assert sale.status_code == 201
    for endpoint, ident in [("products", product_id), ("customers", customer_id), ("sellers", seller_id)]:
        assert client.delete(f"/api/{endpoint}/{ident}").status_code == 200
        assert client.get(f"/api/{endpoint}").json() == []
    history = client.get("/api/sales").json()
    assert history[0]["customer_name"] == "Cliente de prueba"
    assert history[0]["seller_name"] == "Vendedor de prueba"
    assert history[0]["items"][0]["product_name"] == "Artículo de prueba"
    assert client.post(f"/api/sales/{sale.json()['id']}/cancel").status_code == 200


def test_catalog_reactivation_and_expense_edit(client):
    product_id, customer_id, seller_id = add_basics(client)
    for endpoint, ident in [("products", product_id), ("customers", customer_id), ("sellers", seller_id)]:
        assert client.delete(f"/api/{endpoint}/{ident}").status_code == 200
        assert len(client.get(f"/api/{endpoint}?include_inactive=true").json()) == 1
        assert client.patch(f"/api/{endpoint}/{ident}/restore", json={}).status_code == 200
        assert len(client.get(f"/api/{endpoint}").json()) == 1
    expense = client.post("/api/expenses", json={"expense_date": "2026-11-16", "description": "Transporte", "amount": "30.00"})
    assert expense.status_code == 201
    expense_id = expense.json()["id"]
    edited = client.put(f"/api/expenses/{expense_id}", json={"expense_date": "2026-11-17", "description": "Gasolina", "amount": "45.00"})
    assert edited.status_code == 200
    assert edited.json()["amount"] == "45.00"
    assert client.delete(f"/api/expenses/{expense_id}").status_code == 200
    assert client.get("/api/expenses").json() == []
