// server.js - نسخه نهایی با تمام اصلاحات

import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 4000;
const saltRounds = 10;

// تنظیمات CORS
app.use(cors({
  origin: [
    'https://courageous-pasca-eac347.netlify.app',
    'http://localhost:5173',
    'http://192.168.1.4:5173',
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// اتصال هوشمند به پایگاه داده
const { Pool } = pg;
let pool;

if (process.env.DATABASE_URL) {
  console.log("Connecting to production database on Render...");
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  console.log("Connecting to local database...");
  pool = new Pool({
    user: 'vafaei',
    host: 'localhost',
    database: 'eitaa_vendor_db',
    password: '',
    port: 5432,
  });
}

// تابع واقعی ارسال پیام به ایتایار
const sendEitaYarConfirmation = async (chatId, orderId) => {
  const eitaayarToken = process.env.EITAAYAR_TOKEN;
  if (!eitaayarToken) {
    console.error("ERROR: EITAAYAR_TOKEN is not defined in environment variables.");
    return;
  }
  const eitaayarUrl = `https://eitaayar.ir/api/${eitaayarToken}/sendMessage`;
  const messageText = `✅ سفارش شما با شماره پیگیری #${orderId} با موفقیت ثبت شد.`;
  try {
    const response = await axios.post(eitaayarUrl, {
      // ---> اصلاح شد: استفاده از chatId واقعی به جای عدد ثابت <---
      chat_id: chatId,
      text: messageText,
    });
    if (response.data && response.data.ok) {
      console.log(`Successfully sent confirmation to chat_id: ${chatId}`);
    } else {
      console.error("Error from Eitaayar API:", response.data);
    }
  } catch (error) {
    console.error("Failed to send message via Eitaayar:", error.message);
  }
};

// --- بخش ثبت‌نام و ورود فروشندگان ---
app.post('/api/auth/register', async (req, res) => {
  // این بخش بدون تغییر باقی می‌ماند
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'ایمیل و رمز عبور الزامی است.' });
  }
  try {
    const password_hash = await bcrypt.hash(password, saltRounds);
    const newUser = await pool.query(
      'INSERT INTO sellers (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email.toLowerCase(), password_hash]
    );
    res.status(201).json(newUser.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'این ایمیل قبلاً ثبت شده است.' });
    }
    console.error('Register Error:', error.message);
    res.status(500).json({ message: 'خطا در فرآیند ثبت‌نام' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  // این بخش بدون تغییر باقی می‌ماند
  const { email, password } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM sellers WHERE email = $1', [email.toLowerCase()]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'ایمیل یا رمز عبور نامعتبر است.' });
    }
    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'ایمیل یا رمز عبور نامعتبر است.' });
    }
    res.status(200).json({ message: 'ورود موفقیت‌آمیز بود!', token: 'fake-jwt-token-for-seller' });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({ message: 'خطا در فرآیند ورود' });
  }
});

// --- بخش مدیریت محصولات (نسخه نهایی هماهنگ با قالب و دیتابیس جدید) ---

app.get('/api/products', async (req, res) => {
    try {
        // ---> اصلاح شد: به جای is_active از published استفاده می‌کند <---
        const result = await pool.query('SELECT * FROM products WHERE published = true ORDER BY id ASC');
        const productsForFrontend = result.rows.map(p => ({...p, title: p.name}));
        res.status(200).json(productsForFrontend);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'خطا در ارتباط با پایگاه داده' });
    }
});

app.post('/api/products', async (req, res) => {
    // ---> اصلاح شد: تمام فیلدهای جدید را می‌پذیرد <---
    const { name, price, stock, thumbnail, brand, categories, slug } = req.body;
    if (!name || !price || stock === undefined) {
        return res.status(400).json({ message: 'نام، قیمت و موجودی الزامی هستند.' });
    }
    try {
        // ---> اصلاح شد: تمام فیلدهای جدید را در دیتابیس ذخیره می‌کند <---
        const result = await pool.query(
            'INSERT INTO products (name, price, stock, thumbnail, brand, categories, slug, published) VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING *',
            [name, Number(price), Number(stock), thumbnail, brand, categories, slug]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'خطا در ثبت محصول' });
    }
});

app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    // ---> اصلاح شد: تمام فیلدهای جدید را می‌پذیرد <---
    const { name, price, stock, thumbnail, brand, categories, slug, published } = req.body;
    if (!name || !price || stock === undefined) {
        return res.status(400).json({ message: 'نام، قیمت و موجودی الزامی هستند.' });
    }
    try {
        // ---> اصلاح شد: تمام فیلدهای جدید را آپدیت می‌کند <---
        const result = await pool.query(
            'UPDATE products SET name = $1, price = $2, stock = $3, thumbnail = $4, brand = $5, categories = $6, slug = $7, published = $8 WHERE id = $9 RETURNING *',
            [name, Number(price), Number(stock), thumbnail, brand, categories, slug, published, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'محصولی با این شناسه یافت نشد.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'خطا در ویرایش محصول' });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // ---> اصلاح شد: به جای is_active از published استفاده می‌کند <---
        const result = await pool.query(
            'UPDATE products SET published = false WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'محصولی با این شناسه یافت نشد.' });
        }
        res.status(200).json({ message: 'محصول با موفقیت بایگانی شد.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'خطا در ارتباط با پایگاه داده' });
    }
});


// --- بخش مدیریت سفارشات ---
app.get('/api/orders', async (req, res) => {
  // این بخش بدون تغییر باقی می‌ماند
  try {
    const query = `
      SELECT
        o.id, o.customer_chat_id, o.total_amount, o.created_at,
        json_agg(json_build_object('product_name', p.name, 'quantity', oi.quantity, 'price_at_purchase', oi.price_at_purchase)) as items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      GROUP BY o.id
      ORDER BY o.created_at DESC;
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching orders:', err.message);
    res.status(500).json({ message: 'خطا در دریافت لیست سفارشات' });
  }
});

app.post('/api/orders', async (req, res) => {
  // این بخش بدون تغییر باقی می‌ماند
  console.log("Received new order request with body:", JSON.stringify(req.body, null, 2));
    const { customer_chat_id, items } = req.body;
  if (!customer_chat_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'اطلاعات سفارش ناقص یا نامعتبر است.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let total_amount = 0;
    for (const item of items) {
      const productResult = await client.query('SELECT name, price, stock FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
      if (productResult.rows.length === 0) {
        const err = new Error(`محصول با شناسه ${item.product_id} یافت نشد.`);
        err.statusCode = 404;
        throw err;
      }
      const product = productResult.rows[0];
      if (product.stock < item.quantity) {
        const err = new Error(`موجودی محصول "${product.name}" کافی نیست.`);
        err.statusCode = 400;
        throw err;
      }
      total_amount += product.price * item.quantity;
    }
    const orderResult = await client.query(
      'INSERT INTO orders (customer_chat_id, total_amount) VALUES ($1, $2) RETURNING id',
      [customer_chat_id, total_amount]
    );
    const newOrderId = orderResult.rows[0].id;
    for (const item of items) {
      const productResult = await client.query('SELECT price FROM products WHERE id = $1', [item.product_id]);
      const price_at_purchase = productResult.rows[0].price;
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES ($1, $2, $3, $4)',
        [newOrderId, item.product_id, item.quantity, price_at_purchase]
      );
      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }
    await client.query('COMMIT');

    await sendEitaYarConfirmation(customer_chat_id, newOrderId);

    res.status(201).json({ message: 'سفارش با موفقیت ثبت شد.', order_id: newOrderId });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating order:', err.message);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: err.message || 'خطا در ثبت سفارش' });
  } finally {
    client.release();
  }
});


// --- اجرای سرور ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`سرور بک‌اند با موفقیت روی پورت ${PORT} و در تمام شبکه‌ها اجرا شد.`);
});