# API Documentation

## Authentication

### POST /api/auth/login
Request:
```json
{
  "email": "admin@example.com",
  "password": "secret"
}
```
Response:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "name": "Admin",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### POST /api/auth/logout
Clears the auth cookie.

### GET /api/auth/me
Returns the authenticated user.

## Public Menu

### GET /api/public/restaurant
Returns restaurant info.

### GET /api/public/menu?category=&search=
Returns available menu items.

### GET /api/public/table/:token
Resolves a table token to the restaurant and table.

### POST /api/public/orders
Creates a customer order.

### GET /api/public/orders/:orderNumber
Returns order status by order number and table.

## Admin

### GET /api/admin/overview
Returns dashboard summary.

### GET /api/admin/menu
Get all menu items.

### POST /api/admin/menu
Create a menu item.

### PUT /api/admin/menu/:id
Update a menu item.

### DELETE /api/admin/menu/:id
Deletes a menu item.

### GET /api/admin/categories
Get categories.

### POST /api/admin/categories
Create a category.

### GET /api/admin/tables
Get tables.

### POST /api/admin/tables
Create a table.

### POST /api/admin/tables/:id/regenerate-token
Regenerates the NFC token.

### GET /api/admin/orders
Get orders with filters.

## Kitchen

### GET /api/kitchen/orders
Get orders for kitchen display.

### PATCH /api/kitchen/orders/:id/status
Update order status.

## Security

- JWTs are stored in HttpOnly cookies.
- Public endpoints validate the table token server-side.
- Prices are recalculated on the server from menu data.
- Order status changes are validated by backend rules.
