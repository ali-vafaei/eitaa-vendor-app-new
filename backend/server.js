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
    'http://localhost:3001'
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

// تنظیمات پایگاه داده
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

// چک کردن ساختار دیتابیس
app.get('/api/check-table', (req, res) => {
  pool.query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'products'
    ORDER BY ordinal_position
  `)
  .then(tableInfo => {
    return pool.query('SELECT COUNT(*) FROM products')
      .then(countResult => {
        res.status(200).json({
          tableStructure: tableInfo.rows,
          totalRecords: parseInt(countResult.rows[0].count),
          message: 'Table structure checked successfully'
        });
      });
  })
  .catch(err => {
    console.error('Error checking table:', err.message);
    res.status(500).json({ message: 'خطا در چک کردن جدول' });
  });
});

// ایجاد ادمین تست
app.post('/api/create-admin', async (req, res) => {
  try {
    const email = 'admin@test.com';
    const password = 'secret';
    const password_hash = await bcrypt.hash(password, 10);

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

// --- بخش احراز هویت ---
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

  // Admin bypass
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

// دریافت محصولات منتشر شده
app.get('/api/products', async (req, res) => {
  try {
    console.log('🔍 Fetching PUBLISHED products...');
    const result = await pool.query('SELECT * FROM products WHERE published = true OR published IS NULL ORDER BY id DESC');
    console.log(`📦 Found ${result.rows.length} published products`);

    const productsForFrontend = result.rows.map(p => ({
      ...p,
      title: p.name,
      published: p.published !== false
    }));

    res.status(200).json(productsForFrontend);
  } catch (err) {
    console.error('Error in /api/products:', err.message);
    res.status(500).json({ message: 'خطا در ارتباط با پایگاه داده' });
  }
});

// دریافت همه محصولات (منتشر و غیرمنتشر)
app.get('/api/products/all', async (req, res) => {
  try {
    console.log('🔍 Fetching ALL products...');
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    console.log(`📦 Found ${result.rows.length} products total`);

    const productsForFrontend = result.rows.map(p => ({
      ...p,
      title: p.name,
      published: p.published !== false
    }));

    res.status(200).json(productsForFrontend);
  } catch (err) {
    console.error('Error in /api/products/all:', err.message);
    res.status(500).json({ message: 'خطا در ارتباط با پایگاه داده' });
  }
});

// دریافت محصولات پیش‌نویس
app.get('/api/products/drafts', async (req, res) => {
  try {
    console.log('🔍 Fetching DRAFT products...');
    const result = await pool.query('SELECT * FROM products WHERE published = false ORDER BY id DESC');
    console.log(`📦 Found ${result.rows.length} draft products`);

    const productsForFrontend = result.rows.map(p => ({
      ...p,
      title: p.name,
      published: Boolean(p.published)
    }));

    res.status(200).json(productsForFrontend);
  } catch (err) {
    console.error('Error in /api/products/drafts:', err.message);
    res.status(500).json({ message: 'خطا در ارتباط با پایگاه داده' });
  }
});

// جستجو در محصولات
app.get('/api/products/search/:query', async (req, res) => {
  const { query } = req.params;
  try {
    const result = await pool.query(`
      SELECT * FROM products 
      WHERE (name ILIKE $1 OR brand ILIKE $1 OR categories ILIKE $1)
      AND published = true
      ORDER BY name ASC
    `, [`%${query}%`]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در جستجو' });
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
    const product = { ...result.rows[0], title: result.rows[0].name };
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
        'INSERT INTO products (name, price, stock, thumbnail, brand, categories, slug, published) VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING *',
        [name, Number(price), Number(stock), thumbnail, brand,
         Array.isArray(categories) ? categories : [categories], // تبدیل به آرایه
         slug]
    );
    const newProduct = { ...result.rows[0], title: result.rows[0].name };
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
        [name, Number(price), Number(stock), thumbnail, brand,
         Array.isArray(categories) ? categories : [categories], // تبدیل به آرایه
         slug, published, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'محصول پیدا نشد' });
    }

    const updatedProduct = { ...result.rows[0], title: result.rows[0].name };
    res.status(200).json(updatedProduct);
  } catch (err) {
    console.error(err.message);
    if (err.code === '23505') {
      return res.status(409).json({ message: 'محصولی با این slug قبلاً وجود دارد' });
    }
    res.status(500).json({ message: 'خطا در به‌روزرسانی محصول' });
  }
});

// حذف نرم محصول (بایگانی)
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE products SET published = false WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'محصول پیدا نشد' });
    }

    res.status(200).json({ message: 'محصول با موفقیت بایگانی شد' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در بایگانی محصول' });
  }
});

// بازگردانی محصول بایگانی شده
app.patch('/api/products/:id/restore', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE products SET published = true WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'محصول پیدا نشد' });
    }
    res.status(200).json({
      message: 'محصول با موفقیت بازگردانی شد',
      product: result.rows[0]
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در بازگردانی محصول' });
  }
});

// تغییر وضعیت انتشار
app.patch('/api/products/:id/toggle-publish', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE products SET published = NOT published WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'محصولی با این شناسه یافت نشد.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در تغییر وضعیت انتشار' });
  }
});

// دریافت آمار محصولات
app.get('/api/products/stats', async (req, res) => {
  try {
    const totalProducts = await pool.query('SELECT COUNT(*) FROM products');
    const publishedProducts = await pool.query('SELECT COUNT(*) FROM products WHERE published = true');
    const draftProducts = await pool.query('SELECT COUNT(*) FROM products WHERE published = false');
    const lowStockProducts = await pool.query('SELECT COUNT(*) FROM products WHERE stock < 10');

    const stats = {
      total: parseInt(totalProducts.rows[0].count),
      published: parseInt(publishedProducts.rows[0].count),
      draft: parseInt(draftProducts.rows[0].count),
      lowStock: parseInt(lowStockProducts.rows[0].count)
    };

    res.status(200).json(stats);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در دریافت آمار' });
  }
});

// عملیات bulk
app.post('/api/products/bulk-action', async (req, res) => {
  const { action, productIds } = req.body;

  if (!action || !productIds || !Array.isArray(productIds)) {
    return res.status(400).json({ message: 'اطلاعات نامعتبر' });
  }

  try {
    let result;
    switch (action) {
      case 'publish':
        result = await pool.query(
          'UPDATE products SET published = true WHERE id = ANY($1) RETURNING *',
          [productIds]
        );
        break;
      case 'unpublish':
        result = await pool.query(
          'UPDATE products SET published = false WHERE id = ANY($1) RETURNING *',
          [productIds]
        );
        break;
      case 'delete':
        result = await pool.query(
          'DELETE FROM products WHERE id = ANY($1) RETURNING *',
          [productIds]
        );
        break;
      default:
        return res.status(400).json({ message: 'عملیات نامعتبر' });
    }

    res.status(200).json({
      message: `${result.rowCount} محصول با موفقیت ${action} شد`,
      affectedProducts: result.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در اجرای عملیات bulk' });
  }
});

// بک آپ محصولات
app.get('/api/products/export', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=products-backup.json');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در تهیه بک آپ' });
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
  const { customer_chat_id, items } = req.body;

  if (!customer_chat_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'اطلاعات سفارش ناقص یا نامعتبر است.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

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

    const orderResult = await client.query(
      'INSERT INTO orders (customer_chat_id, total_amount) VALUES ($1, $2) RETURNING *',
      [customer_chat_id, totalAmount]
    );
    const newOrder = orderResult.rows[0];

    for (const item of processedItems) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES ($1, $2, $3, $4)',
        [newOrder.id, item.product_id, item.quantity, item.price_at_purchase]
      );

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
// --- API های محصولات برای فرانت‌اند ---

// دریافت همه محصولات با فیلتر
app.get('/api/products', async (req, res) => {
  try {
    const { tag, category, search } = req.query;
    let query = 'SELECT * FROM products WHERE published = true';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND name ILIKE $${params.length}`;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در دریافت محصولات' });
  }
});

// دریافت محصولات پرفروش (برای صفحه اصلی)
app.get('/api/fashion-shop-2/products', async (req, res) => {
  try {
    const { tag } = req.query;
    let query = 'SELECT * FROM products WHERE published = true';

    // فعلاً همه محصولات را برمی‌گردانیم
    // بعداً می‌توانیم فیلتر اضافه کنیم
    if (tag === 'feature') {
      query += ' LIMIT 8';
    } else if (tag === 'sale') {
      query += ' LIMIT 6';
    } else if (tag === 'popular') {
      query += ' LIMIT 6';
    }

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در دریافت محصولات' });
  }
});

// دریافت یک محصول با آی‌دی
app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND published = true',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'محصول یافت نشد' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در دریافت محصول' });
  }
});

// --- API های جدید برای فرانت‌اند ---

// دریافت همه محصولات
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE published = true');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در دریافت محصولات' });
  }
});

// API های fashion-shop-2
app.get('/api/fashion-shop-2/products', async (req, res) => {
  try {
    const { tag } = req.query;
    let query = 'SELECT * FROM products WHERE published = true';

    if (tag === 'feature') {
      query += ' LIMIT 8';
    } else if (tag === 'sale') {
      query += ' LIMIT 6';
    } else if (tag === 'popular') {
      query += ' LIMIT 6';
    } else if (tag === 'latest') {
      query += ' ORDER BY created_at DESC LIMIT 6';
    } else if (tag === 'best-week') {
      query += ' LIMIT 6';
    }

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در دریافت محصولات' });
  }
});

// دریافت محصول با slug یا id
app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // بررسی اینکه آیا id عدد است یا slug
    const isNumber = !isNaN(id);
    const query = isNumber
      ? 'SELECT * FROM products WHERE id = $1 AND published = true'
      : 'SELECT * FROM products WHERE slug = $1 AND published = true';

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'محصول یافت نشد' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در دریافت محصول' });
  }
});

// جستجوی محصولات
app.get('/api/products/search', async (req, res) => {
  const { q } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE published = true AND name ILIKE $1',
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در جستجو' });
  }
});
// --- شروع سرور ---
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});