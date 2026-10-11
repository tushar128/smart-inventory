# Smart Inventory

Full-stack inventory management app.

**Stack:** FastAPI · PostgreSQL · SQLAlchemy · JWT auth · React (Vite) · Swagger UI · Postman

## Features
- Register / login with JWT bearer tokens (bcrypt-hashed passwords)
- Protected REST API: every inventory route requires a valid token
- Product CRUD with SKU uniqueness, categories, locations, prices
- Stock adjustments (add/remove) with a reason, validated so stock never goes below zero
- Full stock-movement history per product
- Search, category filter, low-stock filter, pagination
- Dashboard stats: products, units, stock value, items needing reorder
- Interactive docs at `/docs` (Swagger UI) and a ready Postman collection

## Project structure
```
smart-inventory/
├── backend/
│   ├── app/
│   │   ├── main.py          # app, CORS, routers
│   │   ├── config.py        # settings from .env
│   │   ├── database.py      # SQLAlchemy engine/session
│   │   ├── models.py        # User, Item, StockMovement
│   │   ├── schemas.py       # Pydantic request/response models
│   │   ├── security.py      # bcrypt + JWT helpers
│   │   ├── deps.py          # get_current_user dependency
│   │   └── routers/         # auth.py, items.py
│   ├── seed.py              # demo user + sample data
│   └── requirements.txt
├── frontend/                # React + Vite
├── postman/                 # Postman collection
└── docker-compose.yml       # PostgreSQL
```

## Run it

### 1. Database
```bash
docker compose up -d
```
(or create a database named `smart_inventory` in your own PostgreSQL and edit `DATABASE_URL`)

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # set a strong SECRET_KEY
python seed.py                  # optional demo data
uvicorn app.main:app --reload
```
- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Open http://localhost:5173 and sign in with `admin@demo.com` / `admin123` (if you ran the seed).

## API overview
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Get JWT (form fields `username` = email, `password`) |
| GET | `/api/auth/me` | Current user |
| GET | `/api/items` | List (`q`, `category`, `low_stock`, `skip`, `limit`) |
| POST | `/api/items` | Create product |
| GET/PUT/DELETE | `/api/items/{id}` | Read / update / delete |
| POST | `/api/items/{id}/adjust` | Add or remove stock |
| GET | `/api/items/{id}/movements` | Stock history |
| GET | `/api/items/stats` | Dashboard numbers |
| GET | `/api/items/categories` | Distinct categories |

## Testing the API
**Swagger UI:** open `/docs`, click **Authorize**, enter your email and password, then try any endpoint.

**Postman:** import `postman/Smart-Inventory.postman_collection.json`. Run *Login* first; its test script saves the token into the collection and every other request uses it automatically.

## Ideas to extend
Role-based access (admin/staff), CSV import/export, Alembic migrations, pytest tests, Docker for the whole stack, supplier & purchase-order tables.
