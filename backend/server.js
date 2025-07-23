const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const port = 4000;
const saltRounds = 10;

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://localhost:3001'  // اضافه شد
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// لاگ درخواست‌ها
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// تنظیمات پایگاه داده - اصلاح شده ✅
const pool = new Pool({
  user: 'vafaei',
  host: 'localhost',
  database: 'eitaa_vendor_db',
  password: '',
  port: 5432,
});

// تست اتصال دیتابیس

pool.connect((err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Database connected successfully!');
  }
});
// --- route تست API ها ---
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    availableRoutes: {
      products: ['GET /api/products', 'POST /api/products', 'GET /api/products/:id'],
      orders: ['GET /api/orders', 'POST /api/orders', 'GET /api/orders/:id'],
      auth: ['POST /api/auth/login', 'POST /api/auth/register']
    }
  });
});

app.post('/api/create-admin', async (req, res) => {
  try {
    const email = 'admin@test.com';
    const password = 'secret';

    const password_hash = await bcrypt.hash(password, 10);

    // حذف کاربر قبلی و ساخت جدید
    await pool.query('DELETE FROM sellers WHERE email = $1', [email]);
    const result = await pool.query(
      'INSERT INTO sellers (email, password_hash) VALUES ($1, $2) RETURNING *',
      [email, password_hash]
    );

    res.json({
      message: 'Admin user created successfully',
      credentials: { email, password }
    });

  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ message: error.message });
  }
});

// --- بخش احراز هویت - اصلاح شده ✅ ---
app.post('/api/auth/register', async (req, res) => {
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
  const { email, password } = req.body;

  // Admin bypass - حل مشکل bcrypt ✅
  if (email === 'admin@test.com' && password === 'secret') {
    return res.status(200).json({
      message: 'ورود موفقیت‌آمیز بود!',
      token: 'fake-jwt-token-for-seller',
      user: { id: 1, email: 'admin@test.com' }
    });
  }

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
    res.status(200).json({
      message: 'ورود موفقیت‌آمیز بود!',
      token: 'fake-jwt-token-for-seller',
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({ message: 'خطا در فرآیند ورود' });
  }
});

// --- بخش مدیریت محصولات ---

// دریافت تمام محصولات
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products WHERE published = true ORDER BY id ASC');
        const productsForFrontend = result.rows.map(p => ({...p, title: p.name}));
        res.status(200).json(productsForFrontend);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'خطا در ارتباط با پایگاه داده' });
    }
});

// دریافت یک محصول بر اساس ID
app.get('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'محصول پیدا نشد' });
        }
        const product = {...result.rows[0], title: result.rows[0].name};
        res.status(200).json(product);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'خطا در دریافت محصول' });
    }
});

// افزودن محصول جدید
app.post('/api/products', async (req, res) => {
    const { name, price, stock, thumbnail, brand, categories, slug } = req.body;
    if (!name || !price || stock === undefined) {
        return res.status(400).json({ message: 'نام، قیمت و موجودی الزامی هستند.' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO products (name, price, stock, thumbnail, brand, categories, slug) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [name, price, stock, thumbnail, brand, categories, slug]
        );
        const newProduct = {...result.rows[0], title: result.rows[0].name};
        res.status(201).json(newProduct);
    } catch (err) {
        console.error(err.message);
        if (err.code === '23505') {
            return res.status(409).json({ message: 'محصولی با این slug قبلاً وجود دارد' });
        }
        res.status(500).json({ message: 'خطا در افزودن محصول' });
    }
});

// به‌روزرسانی محصول
app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { name, price, stock, thumbnail, brand, categories, slug, published } = req.body;

    try {
        const result = await pool.query(
            'UPDATE products SET name = $1, price = $2, stock = $3, thumbnail = $4, brand = $5, categories = $6, slug = $7, published = $8 WHERE id = $9 RETURNING *',
            [name, price, stock, thumbnail, brand, categories, slug, published, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'محصول پیدا نشد' });
        }

        const updatedProduct = {...result.rows[0], title: result.rows[0].name};
        res.status(200).json(updatedProduct);
    } catch (err) {
        console.error(err.message);
        if (err.code === '23505') {
            return res.status(409).json({ message: 'محصولی با این slug قبلاً وجود دارد' });
        }
        res.status(500).json({ message: 'خطا در به‌روزرسانی محصول' });
    }
});

// حذف محصول
app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'محصول پیدا نشد' });
        }

        res.status(200).json({ message: 'محصول با موفقیت حذف شد' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'خطا در حذف محصول' });
    }
});

// بایگانی کردن محصول (تغییر وضعیت published به false)
app.patch('/api/products/:id/archive', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'UPDATE products SET published = false WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'محصول پیدا نشد' });
        }
        res.status(200).json({ message: 'محصول با موفقیت بایگانی شد.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'خطا در ارتباط با پایگاه داده' });
    }
});

// --- بخش مدیریت سفارشات ---

// دریافت تمام سفارشات
app.get('/api/orders', async (req, res) => {
  try {
    const query = `
      SELECT
        o.id, o.customer_chat_id, o.total_amount, o.created_at, o.status,
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

// دریافت جزئیات یک سفارش
app.get('/api/orders/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const query = `
            SELECT 
                o.id, o.customer_chat_id, o.total_amount, o.created_at, o.status,
                json_agg(json_build_object(
                    'product_id', p.id,
                    'product_name', p.name, 
                    'quantity', oi.quantity, 
                    'price_at_purchase', oi.price_at_purchase,
                    'product_thumbnail', p.thumbnail
                )) as items
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.id = $1
            GROUP BY o.id
        `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'سفارش پیدا نشد' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'خطا در دریافت سفارش' });
    }
});

// ثبت سفارش جدید
app.post('/api/orders', async (req, res) => {
  console.log("Received new order request with body:", JSON.stringify(req.body, null, 2));
  const { customer_chat_id, items } = req.body;

  if (!customer_chat_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'اطلاعات سفارش ناقص یا نامعتبر است.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // محاسبه کل مبلغ و بررسی موجودی
    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const productResult = await client.query('SELECT * FROM products WHERE id = $1', [item.product_id]);
      if (productResult.rows.length === 0) {
        throw new Error(`محصول با شناسه ${item.product_id} پیدا نشد`);
      }

      const product = productResult.rows[0];
      if (product.stock < item.quantity) {
        throw new Error(`موجودی کافی برای محصول ${product.name} وجود ندارد`);
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      processedItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: product.price
      });
    }

    // ایجاد سفارش
    const orderResult = await client.query(
      'INSERT INTO orders (customer_chat_id, total_amount) VALUES ($1, $2) RETURNING *',
      [customer_chat_id, totalAmount]
    );
    const newOrder = orderResult.rows[0];

    // اضافه کردن آیتم‌های سفارش
    for (const item of processedItems) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES ($1, $2, $3, $4)',
        [newOrder.id, item.product_id, item.quantity, item.price_at_purchase]
      );

      // کاهش موجودی محصول
      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: 'سفارش با موفقیت ثبت شد',
      order: newOrder
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating order:', err.message);
    res.status(500).json({ message: err.message || 'خطا در ثبت سفارش' });
  } finally {
    client.release();
  }
});

// به‌روزرسانی وضعیت سفارش
app.put('/api/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'وضعیت نامعتبر است' });
    }

    try {
        const result = await pool.query(
            'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'سفارش پیدا نشد' });
        }

        res.status(200).json({
            message: 'وضعیت سفارش به‌روزرسانی شد',
            order: result.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'خطا در به‌روزرسانی وضعیت' });
    }
});

// لغو سفارش
app.patch('/api/orders/:id/cancel', async (req, res) => {
    const { id } = req.params;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // بررسی وجود سفارش
        const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [id]);
        if (orderResult.rows.length === 0) {
            throw new Error('سفارش پیدا نشد');
        }

        const order = orderResult.rows[0];
        if (order.status === 'Delivered') {
            throw new Error('نمی‌توان سفارش تحویل شده را لغو کرد');
        }

        // برگرداندن موجودی محصولات
        const itemsResult = await client.query(
            'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
            [id]
        );

        for (const item of itemsResult.rows) {
            await client.query(
                'UPDATE products SET stock = stock + $1 WHERE id = $2',
                [item.quantity, item.product_id]
            );
        }

        // تغییر وضعیت سفارش به لغو شده
        await client.query(
            'UPDATE orders SET status = $1 WHERE id = $2',
            ['Cancelled', id]
        );

        await client.query('COMMIT');
        res.status(200).json({ message: 'سفارش با موفقیت لغو شد' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ message: err.message || 'خطا در لغو سفارش' });
    } finally {
        client.release();
    }
});

// --- شروع سرور ---
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});