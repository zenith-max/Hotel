# NFC Restaurant Ordering System

A complete NFC-based restaurant ordering system with a customer menu, admin dashboard, and kitchen display panel.

## Features

- NFC table tokens that open the customer menu only
- JWT auth with HttpOnly cookies
- MongoDB-backed restaurant, user, table, menu, and order models
- Real-time kitchen updates via Socket.IO
- Admin menu and table management
- Customer order placement with validation
- Kitchen order status tracking
- QR code generation for tables

## Project Structure

- client/ - Vite React frontend
- server/ - Express + MongoDB backend

## Prerequisites

- Node.js 20 LTS or newer (this project is validated against Node 20+)
- MongoDB 7+ running locally or via Atlas
- npm

## Setup

1. Use Node 20:
   nvm use
2. Copy .env.example to .env and fill in the values.
3. Install dependencies:
   npm install
4. Start MongoDB locally.
5. Seed the database:
   npm run seed --workspace server
6. Create an admin account:
   npm run create-admin --workspace server
7. Run development servers:
   npm run dev

> If your environment is on Node 18, the Mongo Memory Server test dependency may fail due runtime incompatibility. For this project, Node 20+ is the required local runtime.

## Default admin credentials

The create-admin script will prompt for email and password and create the first admin user.

## Local URLs

- Customer menu: http://localhost:5173/t/:token
- Admin: http://localhost:5173/admin
- Kitchen: http://localhost:5173/kitchen
- API: http://localhost:5000/api

## Production deployment

- Set NODE_ENV=production
- Use a secure MongoDB connection string
- Set COOKIE_SECURE=true
- Configure CORS to your production domain
- Use a cloud image storage provider for uploads later

## Writing NFC tags

1. Open an NFC writing app on your phone.
2. Write a URL in the format https://yourdomain.com/t/<token>
3. Ensure the URL is public and resolves to the customer menu only.
4. Test by scanning the NFC tag in a browser.

## API Documentation

See server/API.md for the REST API specification.

## Testing

npm test

## License

MIT
