import request from 'supertest';
import app from '../app.js';
import Restaurant from '../models/Restaurant.js';
import User from '../models/User.js';
import Table from '../models/Table.js';
import MenuCategory from '../models/MenuCategory.js';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';
import { setupTestDB, teardownTestDB } from './setup.js';

let adminCookie;
let restaurant;
let table;
let menuItem;

beforeAll(async () => {
  await setupTestDB();

  restaurant = await Restaurant.create({
    name: 'Test Restaurant',
    address: '123 Test St',
    contact: '12345',
    currency: 'USD',
  });

  const adminUser = await User.create({
    name: 'Admin',
    email: 'admin@example.com',
    password: 'Password123!',
    role: 'admin',
    restaurant: restaurant._id,
  });

  const response = await request(app).post('/api/auth/login').send({
    email: 'admin@example.com',
    password: 'Password123!',
  });
  adminCookie = response.headers['set-cookie'][0].split(';')[0];

  table = await Table.create({
    restaurant: restaurant._id,
    tableNumber: '04',
    token: 'tabletesttoken',
    active: true,
  });

  const category = await MenuCategory.create({
    restaurant: restaurant._id,
    name: 'Starters',
    displayOrder: 1,
  });

  menuItem = await MenuItem.create({
    restaurant: restaurant._id,
    category: category._id,
    name: 'Burger',
    description: 'Tasty burger',
    price: 12,
    dietary: 'non-veg',
    available: true,
  });
});

afterAll(async () => {
  await teardownTestDB();
});

describe('Authentication and restaurant flows', () => {
  test('admin login succeeds and /api/auth/me returns user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('admin@example.com');
  });

  test('public NFC table token resolves to a valid table and menu', async () => {
    const res = await request(app).get(`/api/public/table/${table.token}`);
    expect(res.status).toBe(200);
    expect(res.body.table.tableNumber).toBe('04');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  test('admin can update the restaurant profile branding', async () => {
    const res = await request(app)
      .put('/api/admin/restaurant')
      .set('Cookie', adminCookie)
      .send({
        name: 'Harbor Table Bistro',
        logo: 'https://example.com/logo.png',
        address: '42 Bay Road',
        contact: '+91 98765 43210',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.restaurant.name).toBe('Harbor Table Bistro');
    expect(res.body.restaurant.logo).toBe('https://example.com/logo.png');

    const publicRes = await request(app).get(`/api/public/table/${table.token}`);
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.restaurant.name).toBe('Harbor Table Bistro');
    expect(publicRes.body.restaurant.logo).toBe('https://example.com/logo.png');
  });

  test('png upload route accepts logo files and returns a public URL', async () => {
    const res = await request(app)
      .post('/api/admin/upload')
      .set('Cookie', adminCookie)
      .attach('image', Buffer.from('fake-png-content'), { filename: 'logo.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.imageUrl).toContain('http');
  });

  test('order creation works and returns status', async () => {
    const res = await request(app).post('/api/public/orders').send({
      tableToken: table.token,
      clientRequestId: 'req-1',
      items: [
        { menuItemId: menuItem._id.toString(), quantity: 2, specialInstructions: 'No onions' },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.order.total).toBe(24);

    const statusRes = await request(app).get(`/api/public/orders/${res.body.order.orderNumber}?tableToken=${table.token}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.order.status).toBe('Received');
  });

  test('kitchen can advance order status only one step at a time', async () => {
    const order = await Order.findOne({ table: table._id });

    const stepRes = await request(app)
      .patch(`/api/kitchen/orders/${order._id}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'Preparing' });

    expect(stepRes.status).toBe(200);
    expect(stepRes.body.order.status).toBe('Preparing');

    const invalidRes = await request(app)
      .patch(`/api/kitchen/orders/${order._id}/status`)
      .set('Cookie', adminCookie)
      .send({ status: 'Completed' });

    expect(invalidRes.status).toBe(400);
  });

  test('admin can generate a table bill with GST and clear the table after payment', async () => {
    const order = await Order.findOne({ table: table._id });

    const billRes = await request(app)
      .post(`/api/admin/tables/${table._id}/bill`)
      .set('Cookie', adminCookie);

    expect(billRes.status).toBe(200);
    expect(billRes.body.success).toBe(true);
    expect(billRes.body.bill.subtotal).toBe(24);
    expect(billRes.body.bill.gstAmount).toBe(1.2);
    expect(billRes.body.bill.total).toBe(25.2);

    const clearRes = await request(app)
      .post(`/api/admin/tables/${table._id}/clear`)
      .set('Cookie', adminCookie);

    expect(clearRes.status).toBe(200);
    expect(clearRes.body.success).toBe(true);

    const updatedOrder = await Order.findById(order._id);
    expect(updatedOrder.bill.status).toBe('Paid');
  });
});
