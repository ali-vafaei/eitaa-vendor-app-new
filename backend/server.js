const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer'); // ✨ کتابخانه جدید برای آپلود فایل
const path = require('path');   // ✨ کتابخانه داخلی نود برای کار با مسیرها
const fs = require('fs');       // ✨ اضافه شد برای ایجاد پوشه
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

// ✨ ایجاد پوشه uploads اگر وجود ندارد
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Uploads directory created successfully!');
}

// ✨ بخش جدید: سرور کردن فایل‌های استاتیک از پوشه uploads
// این کد به مرورگر اجازه می‌دهد عکس‌های آپلود شده را ببیند
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✨ سرو کردن عکس‌های اصلی قالب از فرانت‌اند
const frontendAssetsPath = path.join(__dirname, '../frontend/public');
app.use('/assets', (req, res, next) => {
  const filePath = path.join(frontendAssetsPath, 'assets', req.path);
  console.log('🔍 Assets request:', req.originalUrl);
  console.log('🔍 Looking for file at:', filePath);
  console.log('🔍 File exists:', fs.existsSync(filePath));
  next();
}, express.static(path.join(frontendAssetsPath, 'assets')));

// ✨ لاگ برای بررسی مسیر
console.log('📁 Frontend assets path:', frontendAssetsPath);
console.log('📁 Assets served from:', path.join(frontendAssetsPath, 'assets'));
const testImagePath = path.join(frontendAssetsPath, 'assets', 'images', 'products', 'Fashion', 'Shoes', '2.PumaBlack.png');
console.log('🧪 Test image path:', testImagePath);
console.log('🧪 Test image exists:', fs.existsSync(testImagePath));

app.get('/uploads', (req, res) => {
  const fs = require('fs');
  try {
    const files = fs.readdirSync('./uploads');
    res.json({
      files: files,
      message: 'Files in uploads directory',
      totalFiles: files.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Cannot read uploads directory' });
  }
});

// ✨ تست endpoint برای بررسی دسترسی به فایل‌ها
app.get('/api/check-assets', (req, res) => {
  const fs = require('fs');
  const assetsPath = path.join(frontendAssetsPath, 'assets', 'images', 'products');

  try {
    if (fs.existsSync(assetsPath)) {
      const files = fs.readdirSync(assetsPath);
      res.json({
        status: 'success',
        assetsPath: assetsPath,
        fileCount: files.length,
        firstFewFiles: files.slice(0, 5)
      });
    } else {
      res.json({
        status: 'error',
        message: 'Assets path not found',
        assetsPath: assetsPath
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      assetsPath: assetsPath
    });
  }
});

// --- ✨ بخش جدید: تنظیمات Multer برای ذخیره فایل‌ها ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // مطمئن شویم که پوشه وجود دارد
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // یک نام منحصر به فرد برای فایل ایجاد می‌کنیم تا جایگزین نشود
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// ✨ اضافه کردن فیلتر برای نوع فایل و محدودیت حجم
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // محدودیت 5MB
  },
  fileFilter: function (req, file, cb) {
    // فقط فایل‌های تصویری مجاز
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('فقط فایل‌های تصویری مجاز هستند!'), false);
    }
  }
});

// ✨ تابع helper برای اصلاح URL های عکس
const fixImageUrls = (product) => {
  const baseUrl = 'http://localhost:4000';

  // اصلاح thumbnail
  if (product.thumbnail && !product.thumbnail.startsWith('http')) {
    product.thumbnail = baseUrl + product.thumbnail;
  }

  // اصلاح آرایه images
  if (product.images && Array.isArray(product.images)) {
    product.images = product.images.map(img => {
      if (img && !img.startsWith('http')) {
        return baseUrl + img;
      }
      return img;
    }).filter(img => img && img.trim() !== ''); // حذف عکس‌های خالی
  } else {
    // ✨ اگر images موجود نیست، از thumbnail استفاده کن
    product.images = product.thumbnail ? [product.thumbnail] : [];
  }

  // ✨ اطمینان از وجود حداقل یک عکس در آرایه
  if (product.images.length === 0 && product.thumbnail) {
    product.images = [product.thumbnail];
  }

  return product;
};


// ✨ API تکی آپلود - اصلاح شده
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'هیچ فایلی انتخاب نشده است' });
    }

    console.log('✅ File uploaded successfully:', req.file.filename);

    // ✨ آدرس کامل عکس آپلود شده با http://localhost:4000
    const imageUrl = `http://localhost:4000/uploads/${req.file.filename}`;
    res.json({
      success: true,
      imageUrl: imageUrl,
      message: 'عکس با موفقیت آپلود شد'
    });

  } catch (error) {
    console.error('خطا در آپلود عکس:', error);
    res.status(500).json({ error: 'خطا در آپلود عکس' });
  }
});

// ✨ API چندگانه آپلود - اصلاح شده
app.post('/api/upload-multiple', upload.array('images', 10), (req, res) => {
  try {
    console.log('📤 Received upload request');
    console.log('📁 Files received:', req.files ? req.files.length : 0);

    if (!req.files || req.files.length === 0) {
      console.log('❌ No files received');
      return res.status(400).json({ error: 'هیچ فایلی انتخاب نشده است' });
    }

    console.log(`✅ ${req.files.length} files uploaded successfully:`);

    // ✨ ایجاد آرایه‌ای از URL‌های کامل عکس‌های آپلود شده
    const imageUrls = req.files.map(file => {
      console.log(`  - ${file.filename} (${file.size} bytes)`);
      return `http://localhost:4000/uploads/${file.filename}`;
    });

    console.log('📋 Final URLs:', imageUrls);

    res.json({
      success: true,
      imageUrls: imageUrls,
      totalUploaded: req.files.length,
      message: `${req.files.length} عکس با موفقیت آپلود شد`,
      // ✨ اضافه کردن جزئیات برای debug
      uploadDetails: req.files.map(f => ({
        originalName: f.originalname,
        filename: f.filename,
        size: f.size,
        url: `http://localhost:4000/uploads/${f.filename}`
      }))
    });

  } catch (error) {
    console.error('❌ خطا در آپلود چندین عکس:', error);
    res.status(500).json({ error: 'خطا در آپلود عکس‌ها' });
  }
});

// ✨ بهبود API اضافه/ویرایش محصول
app.post('/api/products', async (req, res) => {
  const {
    name, price, stock, images, thumbnail, brand, categories,
    slug, discount, rating, size, colors, status, published
  } = req.body;

  console.log('📝 Creating new product with data:');
  console.log('📸 Images received:', images);
  console.log('📸 Images type:', Array.isArray(images) ? 'array' : typeof images);
  console.log('📸 Images count:', Array.isArray(images) ? images.length : 'not array');
  console.log('🖼️ Thumbnail:', thumbnail);

  if (!name || !price || stock === undefined) {
    return res.status(400).json({ message: 'نام، قیمت و موجودی الزامی هستند.' });
  }

  try {
    // ✨ اطمینان از اینکه images آرایه باشد
    let finalImages = [];
    if (Array.isArray(images) && images.length > 0) {
      finalImages = images;
      console.log('✅ Using provided images array:', finalImages.length);
    } else if (thumbnail) {
      finalImages = [thumbnail];
      console.log('✅ Created images array from thumbnail');
    }

    // ✨ انتخاب thumbnail (آخرین عکس یا thumbnail دستی)
    let finalThumbnail = thumbnail;
    if (!finalThumbnail && finalImages.length > 0) {
      finalThumbnail = finalImages[finalImages.length - 1]; // آخرین عکس
      console.log('✅ Selected last image as thumbnail:', finalThumbnail);
    }

    console.log('💾 Final data to save:');
    console.log('📸 Final images:', finalImages);
    console.log('🖼️ Final thumbnail:', finalThumbnail);

    const result = await pool.query(
        `INSERT INTO products (
          name, price, stock, slug, published, images, thumbnail, brand, 
          categories, discount, rating, size, colors, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
        RETURNING *`,
        [
          name,
          Number(price),
          Number(stock),
          slug || `${(name || 'product').toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          published !== false,
          finalImages, // ✨ آرایه کامل عکس‌ها
          finalThumbnail, // ✨ آخرین عکس به عنوان thumbnail
          brand,
          Array.isArray(categories) ? categories : [],
          discount || 0,
          rating || 0,
          size || [],
          colors || [],
          status
        ]
    );

    let newProduct = {
      ...result.rows[0],
      title: result.rows[0].name,
      images: result.rows[0].images // آرایه کامل
    };

    // ✨ اصلاح URL های عکس قبل از ارسال
    newProduct = fixImageUrls(newProduct);

    console.log('✅ Product created successfully:');
    console.log('📸 Images saved:', newProduct.images);
    console.log('🖼️ Thumbnail saved:', newProduct.thumbnail);

    res.status(201).json(newProduct);

  } catch (err) {
    console.error('❌ Error adding product:', err);
    if (err.code === '23505') return res.status(409).json({ message: `محصولی با این slug قبلاً وجود دارد.` });
    res.status(500).json({ message: 'خطا در افزودن محصول به دیتابیس' });
  }
});

// لاگ درخواست‌ها
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// ✨ اتصال به دیتابیس PostgreSQL
const pool = new Pool({
  user: 'vafaei',
  host: 'localhost',
  database: 'eitaa_vendor_db',
  password: '',
  port: 5432,
});

// تست اتصال دیتابیس
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to database:', err);
  } else {
    console.log('✅ Connected to PostgreSQL database successfully!');
    release();
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
// ==========================================================
//               بخش احراز هویت (نسخه نهایی و تمیز)
// ==========================================================

// ثبت نام مشتری
app.post('/api/auth/register/customer', async (req, res) => {
  const { email, password, first_name } = req.body;
  if (!email || !password || !first_name) {
    return res.status(400).json({ message: 'ایمیل، رمز عبور و نام الزامی هستند.' });
  }
  try {
    const password_hash = await bcrypt.hash(password, saltRounds);
    const newCustomer = await pool.query(
      'INSERT INTO customers (email, password_hash, first_name) VALUES ($1, $2, $3) RETURNING id, email, first_name',
      [email.toLowerCase(), password_hash, first_name]
    );
    const user = newCustomer.rows[0];
    res.status(201).json({
      user: { id: user.id, email: user.email, name: { firstName: user.first_name } },
      token: 'fake-jwt-token-for-customer-' + user.id
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'این ایمیل قبلاً ثبت شده است.' });
    }
    console.error('Register Customer Error:', error.message);
    res.status(500).json({ message: 'خطا در فرآیند ثبت‌نام مشتری' });
  }
});

// ثبت نام فروشنده
app.post('/api/auth/register/seller', async (req, res) => {
  const { email, password } = req.body; // فروشنده فقط ایمیل و پسورد نیاز دارد
  if (!email || !password) {
    return res.status(400).json({ message: 'ایمیل و رمز عبور الزامی هستند.' });
  }
  try {
    const password_hash = await bcrypt.hash(password, saltRounds);
    const newSeller = await pool.query(
      'INSERT INTO sellers (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email.toLowerCase(), password_hash]
    );
    const seller = newSeller.rows[0];
    res.status(201).json({
      user: { id: seller.id, email: seller.email },
      token: 'fake-jwt-token-for-seller-' + seller.id
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'این ایمیل قبلاً ثبت شده است.' });
    }
    console.error('Register Seller Error:', error.message);
    res.status(500).json({ message: 'خطا در فرآیند ثبت‌نام فروشنده' });
  }
});


// ورود کاربر (مشتری) - نسخه اصلاح شده
app.post('/api/auth/customer/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`\n[LOGIN ATTEMPT] Received login request for CUSTOMER: ${email}`);

  if (!email || !password) {
    console.log('[LOGIN FAILED] Email or password was not provided.');
    return res.status(400).json({ message: 'ایمیل و رمز عبور الزامی است' });
  }

  try {
    // مرحله ۱: پیدا کردن کاربر در جدول درست (customers)
    const userResult = await pool.query(
      'SELECT * FROM customers WHERE email = $1', // <--- مشکل اینجا بود! باید customers باشد
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      console.log(`[LOGIN FAILED] Customer with email "${email}" not found in database.`);
      return res.status(401).json({ message: 'ایمیل یا رمز عبور نامعتبر است' });
    }

    const user = userResult.rows[0];
    console.log(`[LOGIN STEP] Customer found: ${user.email}. Comparing passwords...`);

    // مرحله ۲: مقایسه کردن رمز عبور وارد شده با هش ذخیره شده
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      console.log(`[LOGIN FAILED] Password comparison failed for customer: ${user.email}`);
      return res.status(401).json({ message: 'ایمیل یا رمز عبور نامعتبر است' });
    }

    // مرحله ۳: موفقیت! ساخت توکن و ارسال پاسخ
    console.log(`[LOGIN SUCCESS] Passwords match for ${user.email}. Generating token...`);

    const token = 'fake-jwt-token-for-customer-' + user.id;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar || '/assets/images/avatars/001-man.svg',
        verified: user.verified,
        name: {
          firstName: user.first_name || '',
          lastName: user.last_name || ''
        }
      },
      token: token
    });

  } catch (error) {
    console.error('[LOGIN ERROR] An unexpzected error occurred:', error);
    res.status(500).json({ message: 'خطا در سرور هنگام ورود' });
  }
});

// این کد را هم برای ورود فروشندگان نگه می‌داریم تا بعداً دچار مشکل نشوید
app.post('/api/auth/login', async (req, res) => {
    // این قسمت برای لاگین فروشندگان است و به آن دست نمی‌زنیم
    const { email, password } = req.body;
    try {
        const userResult = await pool.query('SELECT * FROM sellers WHERE email = $1', [email.toLowerCase()]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'ایمیل یا رمز عبور فروشنده نامعتبر است.' });
        }
        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'ایمیل یا رمز عبور فروشنده نامعتبر است.' });
        }
        res.status(200).json({
            message: 'ورود موفقیت‌آمیز بود!',
            token: 'fake-jwt-token-for-seller-' + user.id,
            user: { id: user.id, email: user.email }
        });
    } catch (error) {
        console.error('Seller Login Error:', error.message);
        res.status(500).json({ message: 'خطا در فرآیند ورود فروشنده' });
    }
});

// --- بخش مدیریت محصولات ---

// دریافت محصولات منتشر شده
app.get('/api/products', async (req, res) => {
  try {
    console.log('🔍 Fetching PUBLISHED products...');
    const result = await pool.query('SELECT * FROM products WHERE published = true OR published IS NULL ORDER BY id DESC');
    console.log(`📦 Found ${result.rows.length} published products`);

    const productsForFrontend = result.rows.map(p => {
      const product = {
        ...p,
        title: p.name,
        published: p.published !== false
      };
      // ✨ اصلاح URL های عکس
      return fixImageUrls(product);
    });

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

    const productsForFrontend = result.rows.map(p => {
      const product = {
        ...p,
        title: p.name,
        published: p.published !== false
      };
      // ✨ اصلاح URL های عکس
      return fixImageUrls(product);
    });

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

    const productsForFrontend = result.rows.map(p => {
      const product = {
        ...p,
        title: p.name,
        published: Boolean(p.published)
      };
      // ✨ اصلاح URL های عکس
      return fixImageUrls(product);
    });

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

    // ✨ اصلاح URL های عکس برای نتایج جستجو
    const productsWithFixedUrls = result.rows.map(product => fixImageUrls(product));
    res.status(200).json(productsWithFixedUrls);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در جستجو' });
  }
});

// --- به‌روزرسانی محصول (اصلاح شده برای آرایه) ---
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const {
    name, price, stock, images, thumbnail, brand, categories,
    slug, published, discount, rating, size, colors, status
  } = req.body;

  console.log('🔄 Updating product ID:', id);
  console.log('📝 Received data:', {
    thumbnail,
    images,
    imagesType: Array.isArray(images) ? 'array' : typeof images,
    imagesLength: Array.isArray(images) ? images.length : 'not array'
  });

  try {
    // ابتدا محصول فعلی را بگیریم
    const currentProduct = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (currentProduct.rows.length === 0) {
      return res.status(404).json({ message: 'محصول پیدا نشد' });
    }

    const existing = currentProduct.rows[0];

    // اگر thumbnail جدید placeholder است، از thumbnail قدیمی استفاده کن
    let finalThumbnail = thumbnail;
    if (thumbnail && thumbnail.includes('placeholder.png') && existing.thumbnail) {
      finalThumbnail = existing.thumbnail;
      console.log('🚫 Prevented placeholder override, keeping:', finalThumbnail);
    }

    // مدیریت images: اگر خالی است، از thumbnail استفاده کن
    let finalImages = images;
    if (!finalImages || finalImages === null || !Array.isArray(finalImages)) {
      finalImages = finalThumbnail ? [finalThumbnail] : [];
      console.log('📸 Images was invalid, using thumbnail:', finalImages);
    }

    console.log('💾 Final data to save:', {
      finalThumbnail,
      finalImages,
      finalImagesType: Array.isArray(finalImages) ? 'array' : typeof finalImages
    });

    const result = await pool.query(
        `UPDATE products SET 
          name = $1, price = $2, stock = $3, images = $4, brand = $5, categories = $6, 
          slug = $7, published = $8, discount = $9, rating = $10, size = $11, colors = $12, 
          thumbnail = $13, status = $14
         WHERE id = $15 RETURNING *`,
        [
          name,
          Number(price),
          Number(stock),
          finalImages, // ✨ مستقیماً آرایه، بدون JSON.stringify
          brand,
          Array.isArray(categories) ? categories : [],
          slug,
          published,
          discount,
          rating,
          size,
          colors,
          finalThumbnail,
          status,
          id
        ]
    );

    let updatedProduct = {
      ...result.rows[0],
      title: result.rows[0].name,
      // ✨ images قبلاً آرایه است، نیازی به parse نیست
      images: result.rows[0].images
    };

    // ✨ اصلاح URL های عکس قبل از ارسال
    updatedProduct = fixImageUrls(updatedProduct);

    console.log('✅ Product updated successfully:', {
      id: updatedProduct.id,
      thumbnail: updatedProduct.thumbnail,
      images: updatedProduct.images
    });

    res.status(200).json(updatedProduct);

  } catch (err) {
    console.error('❌ Error updating product:', err);
    if (err.code === '23505') return res.status(409).json({ message: 'محصولی با این slug قبلاً وجود دارد' });
    res.status(500).json({ message: 'خطا در به‌روزرسانی محصول' });
  }
});

// --- افزودن محصول جدید (اصلاح شده برای آرایه) ---
app.post('/api/products', async (req, res) => {
  const {
    name, price, stock, images, thumbnail, brand, categories,
    slug, discount, rating, size, colors, status, published
  } = req.body;

  console.log('📝 Creating new product with data:', {
    name,
    thumbnail,
    images,
    imagesType: Array.isArray(images) ? 'array' : typeof images,
    imagesLength: Array.isArray(images) ? images.length : 'not array'
  });

  if (!name || !price || stock === undefined) {
    return res.status(400).json({ message: 'نام، قیمت و موجودی الزامی هستند.' });
  }

  try {
    // اطمینان از اینکه images آرایه باشد
    let finalImages = images;
    if (!Array.isArray(finalImages)) {
      finalImages = thumbnail ? [thumbnail] : [];
      console.log('📸 Images was not array, created from thumbnail:', finalImages);
    }

    const result = await pool.query(
        `INSERT INTO products (
          name, price, stock, slug, published, images, thumbnail, brand, 
          categories, discount, rating, size, colors, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
        RETURNING *`,
        [
          name,
          Number(price),
          Number(stock),
          slug || `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          published !== false,
          finalImages, // ✨ مستقیماً آرایه، بدون JSON.stringify
          thumbnail,
          brand,
          Array.isArray(categories) ? categories : [],
          discount || 0,
          rating || 0,
          size || [],
          colors || [],
          status
        ]
    );

    let newProduct = {
      ...result.rows[0],
      title: result.rows[0].name,
      // ✨ images قبلاً آرایه است، نیازی به parse نیست
      images: result.rows[0].images
    };

    // ✨ اصلاح URL های عکس قبل از ارسال
    newProduct = fixImageUrls(newProduct);

    console.log('✅ Product created successfully:', {
      id: newProduct.id,
      thumbnail: newProduct.thumbnail,
      images: newProduct.images
    });

    res.status(201).json(newProduct);

  } catch (err) {
    console.error('❌ Error adding product:', err);
    if (err.code === '23505') return res.status(409).json({ message: `محصولی با این slug قبلاً وجود دارد.` });
    res.status(500).json({ message: 'خطا در افزودن محصول به دیتابیس' });
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

    // ✨ اصلاح URL های عکس
    let restoredProduct = { ...result.rows[0] };
    restoredProduct = fixImageUrls(restoredProduct);

    res.status(200).json({
      message: 'محصول با موفقیت بازگردانی شد',
      product: restoredProduct
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در بازگردانی محصول' });
  }
});

// دریافت یک محصول بر اساس شناسه (ID عددی یا slug متنی)
app.get('/api/products/:identifier', async (req, res) => {
    const { identifier } = req.params;
    try {
        // تشخیص می‌دهیم که شناسه ورودی عدد است یا متن
        const isNumber = !isNaN(parseInt(identifier));

        // بر اساس نوع شناسه، کوئری مناسب را انتخاب می‌کنیم
        const queryText = isNumber
            ? 'SELECT * FROM products WHERE id = $1'
            : 'SELECT * FROM products WHERE slug = $1';

        const result = await pool.query(queryText, [identifier]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'محصول یافت نشد' });
        }

        // محصول پیدا شد، آن را به همراه فیلد title برمی‌گردانیم
        let product = { ...result.rows[0], title: result.rows[0].name };

        // ✨ اصلاح URL های عکس
        product = fixImageUrls(product);

        res.status(200).json(product);

    } catch (err) {
        // در صورت بروز هرگونه خطای دیگر در دیتابیس
        console.error(`[ERROR] fetching product with identifier ${identifier}:`, err.message);
        res.status(500).json({ message: 'خطای سرور در دریافت محصول' });
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

// بک آپ محصولات
app.get('/api/products/export', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id');

    // ✨ اصلاح URL های عکس برای export
    const productsWithFixedUrls = result.rows.map(product => fixImageUrls(product));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=products-backup.json');
    res.status(200).json(productsWithFixedUrls);
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

// دریافت دسته‌بندی‌ها
app.get('/api/categories', async (req, res) => {
  try {
    // دسته‌بندی‌های ثابت برای نمایش در منو
    const categories = [
      { id: 1, name: 'لباس', slug: 'clothing', icon: 'dress' },
      { id: 2, name: 'کفش', slug: 'shoes', icon: 'shoe' },
      { id: 3, name: 'الکترونیک', slug: 'electronics', icon: 'laptop' },
      { id: 4, name: 'زیبایی', slug: 'beauty', icon: 'gift' },
      { id: 5, name: 'ورزشی', slug: 'sports', icon: 'basketball' }
    ];
    res.json(categories);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در دریافت دسته‌بندی‌ها' });
  }
});

// API برای سایر صفحات
app.get('/api/fashion-shop-2/category', async (req, res) => {
  try {
    const categories = [
      { id: 1, name: 'لباس مردانه', slug: 'mens-clothing' },
      { id: 2, name: 'لباس زنانه', slug: 'womens-clothing' },
      { id: 3, name: 'کفش', slug: 'shoes' },
      { id: 4, name: 'اکسسوری', slug: 'accessories' }
    ];
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'خطا' });
  }
});

// سرویس‌ها
app.get('/api/fashion-shop-2/service', async (req, res) => {
  const services = [
    { id: 1, title: 'ارسال رایگان', description: 'برای خرید بالای 500 هزار تومان' },
    { id: 2, title: 'پشتیبانی 24/7', description: 'پاسخگویی در تمام ساعات' },
    { id: 3, title: 'ضمانت بازگشت وجه', description: 'تا 7 روز پس از خرید' }
  ];
  res.json(services);
});
// ===== API های کاربران (مشتریان) =====

// (مطمئن شوید که bcrypt و saltRounds در بالای فایل تعریف شده‌اند)
// import bcrypt from 'bcrypt';
// const saltRounds = 10;

// ثبت نام کاربر
app.post('/api/auth/register/customer', async (req, res) => {
  // ۱. دریافت اطلاعات از بدنه درخواست
  const { email, password, firstName, first_name, lastName, last_name, phone } = req.body;
  const finalFirstName = firstName || first_name || '';
  const finalLastName = lastName || last_name || '';

  // ۲. بررسی ورودی‌های الزامی
  if (!email || !password) {
    return res.status(400).json({ message: 'ایمیل و رمز عبور الزامی است' });
  }

  try {
    // ۳. بررسی وجود کاربر با این ایمیل
    const existingUser = await pool.query(
      'SELECT id FROM customers WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'این ایمیل قبلاً ثبت شده است' });
    }

    // ۴. هش کردن رمز عبور
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // ۵. ایجاد کاربر جدید در دیتابیس
    const newUserResult = await pool.query(
      `INSERT INTO customers (email, password_hash, first_name, last_name, phone) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, first_name, last_name`,
      // ⬇️ تغییر درخواستی استاد شما در اینجا اعمال شده است
      [email.toLowerCase(), passwordHash, finalFirstName, finalLastName, phone || '']
    );

    const user = newUserResult.rows[0];

    // ۶. ارسال پاسخ موفقیت‌آمیز
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: {
          firstName: user.first_name,
          lastName: user.last_name
        }
      },
      token: 'fake-jwt-token-' + user.id // در آینده با توکن واقعی جایگزین شود
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'خطا در فرآیند ثبت نام' });
  }
});

// ورود کاربر
app.post('/api/auth/login/customer', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'ایمیل و رمز عبور الزامی است' });
  }

  try {
    const userResult = await pool.query(
      'SELECT * FROM customers WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'ایمیل یا رمز عبور اشتباه است' });
    }

    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ message: 'ایمیل یا رمز عبور اشتباه است' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar || '/assets/images/avatars/001-man.svg',
        verified: user.verified,
        name: {
          firstName: user.first_name || '',
          lastName: user.last_name || ''
        }
      },
      token: 'fake-jwt-token-' + user.id
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'خطا در ورود' });
  }
});

// دریافت اطلاعات کاربر
app.get('/api/user-list/1', async (req, res) => {
  // فعلاً یک کاربر نمونه برمی‌گردانیم
  // بعداً از توکن JWT استفاده می‌کنیم
  try {
    const userResult = await pool.query(
      'SELECT * FROM customers LIMIT 1'
    );

    if (userResult.rows.length === 0) {
      // کاربر پیش‌فرض
      return res.json({
        id: "1",
        email: "test@example.com",
        phone: "09123456789",
        avatar: "/assets/images/avatars/001-man.svg",
        verified: true,
        name: {
          firstName: "کاربر",
          lastName: "تست"
        }
      });
    }

    const user = userResult.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar || '/assets/images/avatars/001-man.svg',
      verified: user.verified,
      name: {
        firstName: user.first_name || '',
        lastName: user.last_name || ''
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'خطا در دریافت اطلاعات کاربر' });
  }
});

// سفارشات کاربر
app.get('/api/users/orders', async (req, res) => {
  try {
    // فعلاً لیست خالی
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'خطا در دریافت سفارشات' });
  }
});

// آدرس‌های کاربر
app.get('/api/address/user', async (req, res) => {
  try {
    // بعداً از customer_id واقعی استفاده می‌کنیم
    const addresses = await pool.query(
      'SELECT * FROM customer_addresses WHERE customer_id = 1'
    );

    res.json(addresses.rows.map(addr => ({
      id: addr.id,
      title: addr.title,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      country: addr.country,
      zip: addr.zip,
      phone: addr.phone,
      isDefault: addr.is_default
    })));
  } catch (error) {
    res.status(500).json({ message: 'خطا در دریافت آدرس‌ها' });
  }
});

// ✨ API تست گالری - اضافه کنید به server.js
app.get('/api/test-gallery/:id', async (req, res) => {
  const { id } = req.params;

  try {
    console.log('🖼️ Testing gallery for product ID:', id);

    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'محصول پیدا نشد' });
    }

    let product = result.rows[0];

    console.log('📸 Raw product data:');
    console.log('- thumbnail:', product.thumbnail);
    console.log('- images:', product.images);
    console.log('- images type:', Array.isArray(product.images) ? 'array' : typeof product.images);
    console.log('- images length:', Array.isArray(product.images) ? product.images.length : 'not array');

    // اعمال fixImageUrls
    product = fixImageUrls(product);

    console.log('📸 After fixImageUrls:');
    console.log('- thumbnail:', product.thumbnail);
    console.log('- images:', product.images);
    console.log('- images length:', product.images ? product.images.length : 'null');

    res.json({
      productId: product.id,
      productName: product.name,
      thumbnail: product.thumbnail,
      images: product.images,
      imagesCount: product.images ? product.images.length : 0,
      debug: {
        rawThumbnail: result.rows[0].thumbnail,
        rawImages: result.rows[0].images,
        fixedThumbnail: product.thumbnail,
        fixedImages: product.images
      }
    });

  } catch (err) {
    console.error('❌ Gallery test error:', err);
    res.status(500).json({ message: 'خطا در تست گالری' });
  }
});

// ✨ API برای اضافه کردن عکس‌های تست به محصول
app.get('/api/add-test-images/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // عکس‌های تست
    const testImages = [
      '/assets/images/products/Fashion/Shoes/1.Nike.png',
      '/assets/images/products/Fashion/Shoes/2.PumaBlack.png',
      '/assets/images/products/Fashion/Shoes/3.ADIDAS2019.png',
      '/assets/images/products/Electronics/1.Moto.png',
      '/assets/images/products/Electronics/2.Honor.png'
    ];

    const result = await pool.query(
      'UPDATE products SET images = $1 WHERE id = $2 RETURNING *',
      [testImages, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'محصول پیدا نشد' });
    }

    console.log('✅ Test images added to product:', id);
    console.log('📸 Images:', testImages);

    res.json({
      message: 'عکس‌های تست با موفقیت اضافه شد',
      productId: id,
      imagesAdded: testImages.length,
      images: testImages
    });

  } catch (err) {
    console.error('❌ Error adding test images:', err);
    res.status(500).json({ message: 'خطا در اضافه کردن عکس‌های تست' });
  }
});

// --- شروع سرور ---
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});