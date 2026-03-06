# SpaceNode E-Commerce API

Full-featured online store REST API built with SpaceNode.

**Features:**
- Registration & authentication (Bearer tokens, bcrypt)
- Role-based access (user / admin)
- Products CRUD (admin) + listing with search & pagination (public)
- Categories CRUD (admin) + listing (public)
- Shopping cart (authenticated users)
- DTO request validation
- Event system (action logging)

---

## Prerequisites

- Node.js 18+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

## Setup

1. Install dependencies:
```bash
cd examples/ecommerce
npm install
```

2. Create a `.env` file with your MongoDB connection string:
```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<database>
```

For local MongoDB:
```env
MONGO_URI=mongodb://localhost:27017/ecommerce
```

3. Start the server:
```bash
node index.js
# → Server: http://localhost:3000
```

---

## Running Tests

Integration tests run against a real MongoDB database (using the same `MONGO_URI` from `.env`).
All test data is automatically cleaned up after completion.

```bash
cd examples/ecommerce
node --test test.js
```

Expected output:
```
▶ Auth (10 tests)
▶ Categories (8 tests)
▶ Products (11 tests)
▶ Cart (11 tests)
▶ Delete operations (5 tests)

ℹ tests 46
ℹ pass 46
ℹ fail 0
```

---

## API Reference

### Error Responses

All errors return JSON with the same structure:

```json
{ "error": "Error message", "status": 400 }
```

Validation errors include details:
```json
{
  "error": "Validation failed",
  "status": 400,
  "details": {
    "name": "Field is required",
    "price": "Must be at least 0"
  }
}
```

---

### Auth — `/auth`

| Method | Path             | Description     | Access  |
|--------|------------------|-----------------|---------|
| POST   | `/auth/register` | Register        | Public  |
| POST   | `/auth/login`    | Login           | Public  |
| GET    | `/auth/me`       | Current user    | Auth    |

#### POST `/auth/register`

Create a new user account.

**Request:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "email": "john@test.com", "password": "secret123"}'
```

**Body (validated by DTO):**
| Field      | Type   | Rules                          |
|------------|--------|--------------------------------|
| `name`     | string | required, 2–50 characters      |
| `email`    | string | required, valid email          |
| `password` | string | required, 6–100 characters     |

**Response `201`:**
```json
{
  "user": {
    "id": "6650f1a2b3c4d5e6f7890123",
    "name": "John",
    "email": "john@test.com",
    "role": "user"
  },
  "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Errors:**
| Status | Error                               |
|--------|-------------------------------------|
| 400    | Validation failed (invalid body)    |
| 409    | User with this email already exists |

---

#### POST `/auth/login`

Authenticate with email and password.

**Request:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@test.com", "password": "secret123"}'
```

**Response `200`:**
```json
{
  "user": {
    "id": "6650f1a2b3c4d5e6f7890123",
    "name": "John",
    "email": "john@test.com",
    "role": "user"
  },
  "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Errors:**
| Status | Error                     |
|--------|---------------------------|
| 401    | Invalid email or password |

---

#### GET `/auth/me`

Get the currently authenticated user.

**Request:**
```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer <token>"
```

**Response `200`:**
```json
{
  "user": {
    "id": "6650f1a2b3c4d5e6f7890123",
    "name": "John",
    "email": "john@test.com",
    "role": "user",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Errors:**
| Status | Error                  |
|--------|------------------------|
| 401    | Authorization required |

---

### Products — `/products`

| Method | Path            | Description      | Access  |
|--------|-----------------|------------------|---------|
| GET    | `/products`     | List products    | Public  |
| GET    | `/products/:id` | Single product   | Public  |
| POST   | `/products`     | Create product   | Admin   |
| PUT    | `/products/:id` | Update product   | Admin   |
| DELETE | `/products/:id` | Delete product   | Admin   |

#### GET `/products`

List products with optional filtering and pagination.

**Query parameters:**
| Param        | Type   | Description                  | Default |
|--------------|--------|------------------------------|---------|
| `categoryId` | string | Filter by category ObjectId  | —       |
| `search`     | string | Search in name & description | —       |
| `page`       | number | Page number                  | 1       |
| `limit`      | number | Items per page               | 20      |

**Request:**
```bash
# All products
curl http://localhost:3000/products

# Search + pagination
curl "http://localhost:3000/products?search=iphone&page=1&limit=5"

# By category
curl "http://localhost:3000/products?categoryId=6650f1a2b3c4d5e6f7890123"
```

**Response `200`:**
```json
{
  "items": [
    {
      "_id": "6650f2b3c4d5e6f789012345",
      "name": "iPhone 16",
      "price": 999,
      "categoryId": "6650f1a2b3c4d5e6f7890123",
      "description": "Latest Apple smartphone",
      "stock": 50,
      "image": "https://example.com/iphone16.jpg",
      "active": true,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pages": 1
}
```

---

#### GET `/products/:id`

Get a single product by ID.

**Response `200`:**
```json
{
  "_id": "6650f2b3c4d5e6f789012345",
  "name": "iPhone 16",
  "price": 999,
  "categoryId": "6650f1a2b3c4d5e6f7890123",
  "description": "Latest Apple smartphone",
  "stock": 50,
  "image": "",
  "active": true,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

**Errors:**
| Status | Error             |
|--------|-------------------|
| 404    | Product not found |

---

#### POST `/products` (Admin)

Create a new product.

**Request:**
```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "name": "Galaxy Buds3 Pro",
    "price": 16990,
    "categoryId": "6650f1a2b3c4d5e6f7890123",
    "description": "Samsung wireless earbuds",
    "stock": 50,
    "image": "https://example.com/buds3.jpg"
  }'
```

**Body (validated by DTO):**
| Field         | Type   | Rules                          |
|---------------|--------|--------------------------------|
| `name`        | string | required, 2–200 characters     |
| `price`       | number | required, min 0                |
| `categoryId`  | string | required (valid category ID)   |
| `description` | string | optional, max 2000 characters  |
| `stock`       | number | optional, min 0 (default: 0)   |
| `image`       | string | optional, max 500 characters   |

**Response `201`:** Returns the created product object.

**Errors:**
| Status | Error                          |
|--------|--------------------------------|
| 400    | Validation failed              |
| 400    | Category not found             |
| 401    | Authorization required         |
| 403    | Admin access only              |

---

#### PUT `/products/:id` (Admin)

Update a product. Send only the fields you want to change.

**Request:**
```bash
curl -X PUT http://localhost:3000/products/6650f2b3c4d5e6f789012345 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"price": 899, "stock": 25}'
```

**Body (validated by DTO):**
| Field         | Type    | Rules                         |
|---------------|---------|-------------------------------|
| `name`        | string  | 2–200 characters              |
| `price`       | number  | min 0                         |
| `categoryId`  | string  | valid category ID             |
| `description` | string  | max 2000 characters           |
| `stock`       | number  | min 0                         |
| `image`       | string  | max 500 characters            |
| `active`      | boolean | enable/disable product        |

**Response `200`:** Returns the updated product object.

**Errors:**
| Status | Error              |
|--------|--------------------|
| 400    | Validation failed  |
| 401    | Authorization required |
| 403    | Admin access only  |
| 404    | Product not found  |

---

#### DELETE `/products/:id` (Admin)

Delete a product permanently.

**Response `204`:** No content.

**Errors:**
| Status | Error                  |
|--------|------------------------|
| 401    | Authorization required |
| 403    | Admin access only      |
| 404    | Product not found      |

---

### Categories — `/categories`

| Method | Path               | Description       | Access  |
|--------|---------------------|-------------------|---------|
| GET    | `/categories`       | List categories   | Public  |
| GET    | `/categories/:id`   | Single category   | Public  |
| POST   | `/categories`       | Create category   | Admin   |
| PUT    | `/categories/:id`   | Update category   | Admin   |
| DELETE | `/categories/:id`   | Delete category   | Admin   |

#### GET `/categories`

**Response `200`:**
```json
[
  {
    "_id": "6650f1a2b3c4d5e6f7890123",
    "name": "Smartphones",
    "description": "Mobile phones and accessories",
    "icon": "📱",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
]
```

---

#### GET `/categories/:id`

**Response `200`:** Returns a single category object.

**Errors:**
| Status | Error              |
|--------|--------------------|
| 404    | Category not found |

---

#### POST `/categories` (Admin)

**Request:**
```bash
curl -X POST http://localhost:3000/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"name": "Smartphones", "description": "Mobile phones", "icon": "📱"}'
```

**Body (validated by DTO):**
| Field         | Type   | Rules                         |
|---------------|--------|-------------------------------|
| `name`        | string | required, 2–100 characters    |
| `description` | string | optional, max 500 characters  |
| `icon`        | string | optional, max 200 characters  |

**Response `201`:** Returns the created category object.

**Errors:**
| Status | Error                  |
|--------|------------------------|
| 400    | Validation failed      |
| 401    | Authorization required |
| 403    | Admin access only      |

---

#### PUT `/categories/:id` (Admin)

**Response `200`:** Returns the updated category object.

**Errors:**
| Status | Error                  |
|--------|------------------------|
| 400    | Validation failed      |
| 401    | Authorization required |
| 403    | Admin access only      |
| 404    | Category not found     |

---

#### DELETE `/categories/:id` (Admin)

**Response `204`:** No content.

**Errors:**
| Status | Error                  |
|--------|------------------------|
| 401    | Authorization required |
| 403    | Admin access only      |
| 404    | Category not found     |

---

### Cart — `/cart`

All cart routes require authentication (`Authorization: Bearer <token>`).

`:id` in cart routes is the `productId`.

| Method | Path             | Description        | Access |
|--------|------------------|--------------------|--------|
| GET    | `/cart`          | Cart contents      | Auth   |
| POST   | `/cart/items`    | Add to cart        | Auth   |
| PUT    | `/cart/items/:id`| Update quantity    | Auth   |
| DELETE | `/cart/items/:id`| Remove from cart   | Auth   |
| DELETE | `/cart`          | Clear cart         | Auth   |

#### GET `/cart`

Get the current user's cart with populated product info.

**Response `200`:**
```json
{
  "items": [
    {
      "productId": {
        "_id": "6650f2b3c4d5e6f789012345",
        "name": "iPhone 16",
        "price": 999,
        "image": ""
      },
      "quantity": 2,
      "addedAt": "2025-01-15T12:00:00.000Z"
    }
  ],
  "total": 1998,
  "count": 1
}
```

Empty cart:
```json
{ "items": [], "total": 0, "count": 0 }
```

---

#### POST `/cart/items`

Add a product to the cart. If the product is already in the cart, the quantity is incremented.

**Request:**
```bash
curl -X POST http://localhost:3000/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"productId": "6650f2b3c4d5e6f789012345", "quantity": 2}'
```

**Body (validated by DTO):**
| Field       | Type   | Rules                         |
|-------------|--------|-------------------------------|
| `productId` | string | required (valid product ID)   |
| `quantity`  | number | optional, 1–99 (default: 1)   |

**Response `201`:**
```json
{
  "message": "iPhone 16 added to cart",
  "item": { ... }
}
```

**Errors:**
| Status | Error                                    |
|--------|------------------------------------------|
| 400    | Validation failed                        |
| 400    | Product is not available for purchase    |
| 400    | Not enough stock (available: 5)          |
| 401    | Authorization required                   |
| 404    | Product not found                        |

---

#### PUT `/cart/items/:id`

Update item quantity. If `quantity` is 0 or less, the item is removed from the cart.

**Request:**
```bash
curl -X PUT http://localhost:3000/cart/items/6650f2b3c4d5e6f789012345 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"quantity": 3}'
```

**Body (validated by DTO):**
| Field      | Type   | Rules                |
|------------|--------|----------------------|
| `quantity` | number | required, 0–99       |

**Response `200`:** Returns the updated cart object.

**Errors:**
| Status | Error                           |
|--------|---------------------------------|
| 400    | Not enough stock (available: N) |
| 401    | Authorization required          |
| 404    | Product not found               |
| 404    | Product not found in cart       |

---

#### DELETE `/cart/items/:id`

Remove a product from the cart.

**Request:**
```bash
curl -X DELETE http://localhost:3000/cart/items/6650f2b3c4d5e6f789012345 \
  -H "Authorization: Bearer <token>"
```

**Response `200`:**
```json
{ "message": "Product removed from cart" }
```

**Errors:**
| Status | Error                    |
|--------|--------------------------|
| 401    | Authorization required   |
| 404    | Product not found in cart|

---

#### DELETE `/cart`

Clear the entire cart.

**Request:**
```bash
curl -X DELETE http://localhost:3000/cart \
  -H "Authorization: Bearer <token>"
```

**Response `200`:**
```json
{ "message": "Cart cleared" }
```

---

## Architecture

```
ecommerce/
├── index.js                    # Entry point, auth + guard + app
├── test.js                     # Integration tests (46 tests)
├── .env                        # MONGO_URI (not in git)
├── models/
│   ├── user.model.js           # User schema + bcrypt hashing
│   ├── token.model.js          # Auth tokens
│   ├── product.model.js        # Product schema
│   ├── category.model.js       # Category schema
│   └── cart.model.js           # Cart schema (per-user)
└── modules/
    ├── auth/
    │   ├── module.js           # Routes /auth
    │   ├── auth.controller.js  # register, login, me
    │   ├── auth.service.js     # userStore + tokenStore
    │   └── auth.dto.js         # Input validation schemas
    ├── product/
    │   ├── module.js           # Routes /products
    │   ├── product.controller.js
    │   ├── product.service.js  # productStore
    │   └── product.dto.js
    ├── category/
    │   ├── module.js           # Routes /categories
    │   ├── category.controller.js
    │   ├── category.service.js # categoryStore
    │   └── category.dto.js
    └── cart/
        ├── module.js           # Routes /cart (all auth)
        ├── cart.controller.js
        ├── cart.service.js     # cartStore (per-user)
        └── cart.dto.js
```

## Roles

| Role  | Products    | Categories  | Cart | Auth          |
|-------|-------------|-------------|------|---------------|
| Guest | View only   | View only   | No   | Register/Login|
| User  | View only   | View only   | Yes  | Yes           |
| Admin | Full CRUD   | Full CRUD   | Yes  | Yes           |

## SpaceNode Features Used

- `defineAuth()` — global Bearer token verification
- `defineGuard('admin')` — custom guard for admin role
- `dto:schemaName` — automatic body validation via DTO schemas
- `request.check()` — declarative assertions with auto error response
- `request.guard()` — inverse assertion (throw if truthy)
- `request.emit()` — event bus notifications
- Modular structure with auto-discovery from `modules/`
- `services` — auto-injection of services from `*.service.js`
