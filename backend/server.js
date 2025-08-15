const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer'); // ✨ کتابخانه جدید برای آپلود فایل
const path = require('path');   // ✨ کتابخانه داخلی نود برای کار با مسیرها
const sharp = require('sharp'); // برای تغییر سایز تصاویر
const fs = require('fs-extra');
const fileType = require('file-type');
const mimeTypes = require('mime-types');
const app = express();
const port = 4000;
const saltRounds = 10;

  // ========================= UPLOAD CONFIGURATION =========================
  const UPLOAD_CONFIG = {
    // مسیر اصلی آپلود
    UPLOAD_DIR: 'uploads',
    MEDIA_DIR: 'uploads/media',
    THUMBNAILS_DIR: 'uploads/thumbnails',

    // حداکثر سایز فایل (10MB)
    MAX_FILE_SIZE: 10 * 1024 * 1024,

    // فرمت‌های مجاز
    ALLOWED_MIME_TYPES: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'application/pdf'
    ],

    // سایزهای thumbnail
    THUMBNAIL_SIZES: {
      small: { width: 150, height: 150 },
      medium: { width: 300, height: 300 },
      large: { width: 600, height: 600 }
    }
  };

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

// ========================= ENHANCED STATIC FILE SERVING =========================
// سرو کردن فایل‌های media با کنترل دسترسی

app.use('/uploads/thumbnails', express.static(UPLOAD_CONFIG.THUMBNAILS_DIR));
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

// ========================= UTILITIES =========================

// ایجاد پوشه‌های مورد نیاز
const ensureDirectories = async () => {
  try {
    await fs.ensureDir(UPLOAD_CONFIG.MEDIA_DIR);
    await fs.ensureDir(UPLOAD_CONFIG.THUMBNAILS_DIR);
    console.log('✅ Upload directories created successfully');
  } catch (error) {
    console.error('❌ Error creating upload directories:', error);
  }
};

// تولید نام یکتا برای فایل
const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const ext = path.extname(originalName);
  return `${timestamp}-${random}${ext}`;
};

// بررسی نوع فایل با file-type
const validateFileType = async (filePath) => {
  try {
    const fileTypeResult = await fileType.fromFile(filePath);
    return fileTypeResult && UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(fileTypeResult.mime);
  } catch (error) {
    return false;
  }
};

// تولید thumbnail برای تصاویر
const generateThumbnails = async (inputPath, filename) => {
  const thumbnails = {};
  const nameWithoutExt = path.parse(filename).name;

  try {
    for (const [size, dimensions] of Object.entries(UPLOAD_CONFIG.THUMBNAIL_SIZES)) {
      const outputPath = path.join(
        UPLOAD_CONFIG.THUMBNAILS_DIR,
        `${nameWithoutExt}-${size}.jpg`
      );

      await sharp(inputPath)
        .resize(dimensions.width, dimensions.height, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(outputPath);

      thumbnails[size] = `/uploads/thumbnails/${path.basename(outputPath)}`;
    }

    return thumbnails;
  } catch (error) {
    console.error('Error generating thumbnails:', error);
    return {};
  }
};

// فشرده‌سازی تصاویر
const optimizeImage = async (inputPath, outputPath, mimeType) => {
  try {
    const image = sharp(inputPath);

    switch (mimeType) {
      case 'image/jpeg':
      case 'image/jpg':
        await image
          .jpeg({ quality: 85, progressive: true })
          .toFile(outputPath);
        break;

      case 'image/png':
        await image
          .png({ quality: 85, progressive: true })
          .toFile(outputPath);
        break;

      case 'image/webp':
        await image
          .webp({ quality: 85 })
          .toFile(outputPath);
        break;

      default:
        // برای سایر فرمت‌ها فقط کپی کن
        await fs.copy(inputPath, outputPath);
    }

    return true;
  } catch (error) {
    console.error('Error optimizing image:', error);
    return false;
  }
};
// ========================= MIDDLEWARE =========================

// Middleware برای بررسی دقیق‌تر فایل‌ها بعد از آپلود
const validateUploadedFiles = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  const validFiles = [];
  const invalidFiles = [];

  for (const file of req.files) {
    try {
      // بررسی نوع فایل با file-type
      const isValidType = await validateFileType(file.path);

      if (isValidType) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file);
        // حذف فایل نامعتبر
        await fs.unlink(file.path);
      }
    } catch (error) {
      console.error('Error validating file:', error);
      invalidFiles.push(file);
      try {
        await fs.unlink(file.path);
      } catch (unlinkError) {
        console.error('Error deleting invalid file:', unlinkError);
      }
    }
  }

  if (invalidFiles.length > 0) {
    return res.status(400).json({
      message: `${invalidFiles.length} فایل نامعتبر حذف شد`,
      invalidFiles: invalidFiles.map(f => f.originalname)
    });
  }

  req.files = validFiles;
  next();
};

// Middleware برای محدود کردن دسترسی به فایل‌ها
const protectMediaAccess = (req, res, next) => {
  const filePath = req.path;

  // فقط فایل‌های موجود در دیتابیس قابل دسترسی هستند
  // این middleware را می‌توان برای کنترل دسترسی استفاده کرد

  next();
};


app.use('/uploads/media', protectMediaAccess, express.static(UPLOAD_CONFIG.MEDIA_DIR));

//======//
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
/*
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

*/

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOAD_CONFIG.MEDIA_DIR);
    },
    filename: (req, file, cb) => {
      const uniqueName = generateUniqueFilename(file.originalname);
      cb(null, uniqueName);
    }
  });

  const fileFilter = (req, file, cb) => {
    // بررسی اولیه MIME type
    if (UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`نوع فایل ${file.mimetype} مجاز نیست`), false);
    }
  };

  const upload = multer({
    storage: storage,
    limits: {
      fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
      files: 10 // حداکثر 10 فایل در هر درخواست
    },
    fileFilter: fileFilter
  });;



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
// ========================= MEDIA ENDPOINTS =========================

// ✅ اندپوینت بهبودیافته برای دریافت لیست فایل‌های مدیا با قابلیت جستجو، فیلتر و صفحه‌بندی
app.get('/api/media', async (req, res) => {
  try {
    console.log('🔍 Fetching media files with params:', req.query);

    const {
      page = 1,
      limit = 20,
      search = '',
      mimeType = '',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;

    let whereClause = 'WHERE deleted_at IS NULL';
    const queryParams = [];
    let paramCount = 0;

    // فیلتر بر اساس جستجو در نام یا عنوان
    if (search && search.trim() !== '') {
      paramCount++;
      whereClause += ` AND (original_name ILIKE $${paramCount} OR title ILIKE $${paramCount} OR filename ILIKE $${paramCount})`;
      queryParams.push(`%${search.trim()}%`);
    }

    // فیلتر بر اساس نوع فایل
    if (mimeType && mimeType.trim() !== '') {
      paramCount++;
      whereClause += ` AND mime_type LIKE $${paramCount}`;
      queryParams.push(`${mimeType.trim()}%`);
    }

    // اعتبارسنجی sortBy
    const allowedSortFields = ['created_at', 'updated_at', 'original_name', 'file_size', 'mime_type', 'filename'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';

    // اعتبارسنجی sortOrder
    const validSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // کوئری اصلی
    const mainQueryParams = [...queryParams, parseInt(limit), offset];
    const query = `
      SELECT id, filename, original_name, file_url, file_size, mime_type, 
             alt_text, title, caption, width, height, created_at, updated_at, thumbnails
      FROM media 
      ${whereClause}
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const result = await pool.query(query, mainQueryParams);

    // شمارش کل رکوردها برای pagination
    const countQuery = `SELECT COUNT(*) FROM media ${whereClause}`;
    const countParams = queryParams.slice(0); // حذف limit و offset لازم نیست چون در queryParams نیستند
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    console.log(`✅ Found ${result.rows.length} media files out of ${totalCount} total`);

    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      filters: {
        search,
        mimeType,
        sortBy: validSortBy,
        sortOrder: validSortOrder
      }
    });

  } catch (err) {
    console.error('❌ Error fetching media files:', err.message);
    console.error('Stack trace:', err.stack);

    if (err.message.includes('relation "media" does not exist')) {
      return res.json({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        filters: { search: '', mimeType: '', sortBy: 'created_at', sortOrder: 'desc' },
        warning: 'جدول media هنوز ایجاد نشده است.'
      });
    }

    res.status(500).json({
      message: 'خطا در دریافت فایل‌ها',
      error: err.message
    });
  }
});

  // ========================= ENHANCED UPLOAD ENDPOINT =========================
app.post('/api/media/upload',
  upload.array('files', 10),
  validateUploadedFiles,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'هیچ فایل معتبری آپلود نشده' });
      }

      const uploadedFiles = [];

      for (const file of req.files) {
        let width = null, height = null, thumbnails = {};

        // بررسی اینکه آیا فایل تصویر است
        if (file.mimetype.startsWith('image/')) {
          try {
            // دریافت ابعاد اصلی
            const metadata = await sharp(file.path).metadata();
            width = metadata.width;
            height = metadata.height;

            // بهینه‌سازی تصویر
            const optimizedPath = path.join(
              UPLOAD_CONFIG.MEDIA_DIR,
              `optimized-${file.filename}`
            );

            const optimized = await optimizeImage(file.path, optimizedPath, file.mimetype);

            if (optimized) {
              // جایگزین کردن فایل اصلی با نسخه بهینه‌شده
              await fs.unlink(file.path);
              await fs.move(optimizedPath, file.path);
            }

            // تولید thumbnail ها
            thumbnails = await generateThumbnails(file.path, file.filename);

          } catch (error) {
            console.error('Error processing image:', error);
          }
        }

        // دریافت سایز نهایی فایل
        const stats = await fs.stat(file.path);

        // ذخیره در دیتابیس
        const result = await pool.query(
          `INSERT INTO media (
            filename, original_name, file_path, file_url, file_size, 
            mime_type, width, height, thumbnails, uploaded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [
            file.filename,
            file.originalname,
            file.path,
            `/uploads/media/${file.filename}`,
            stats.size,
            file.mimetype,
            width,
            height,
            JSON.stringify(thumbnails),
            req.user?.id || 1
          ]
        );

        uploadedFiles.push({
          ...result.rows[0],
          thumbnails
        });
      }

      res.status(201).json({
        message: 'فایل‌ها با موفقیت آپلود شدند',
        files: uploadedFiles
      });

    } catch (error) {
      console.error('Upload error:', error);

      // پاک‌سازی فایل‌های آپلود شده در صورت خطا
      if (req.files) {
        for (const file of req.files) {
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.error('Error cleaning up file:', unlinkError);
          }
        }
      }

      res.status(500).json({ message: 'خطا در آپلود فایل' });
    }
  }
);

  // به‌روزرسانی اطلاعات فایل (alt text, title, caption)
  app.put('/api/media/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { alt_text, title, caption } = req.body;

      const result = await pool.query(
        `UPDATE media SET alt_text = $1, title = $2, caption = $3, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4 AND deleted_at IS NULL RETURNING *`,
        [alt_text, title, caption, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'فایل یافت نشد' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'خطا در به‌روزرسانی فایل' });
    }
  });

  // حذف فایل (soft delete)
  app.delete('/api/media/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'UPDATE media SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'فایل یافت نشد' });
      }

      res.json({ message: 'فایل با موفقیت حذف شد' });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'خطا در حذف فایل' });
    }
  });

  // ========================= CAROUSEL ENDPOINTS =========================

  // دریافت لیست carousel items
  app.get('/api/carousel', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT c.*, m.file_url as image_url, m.alt_text, m.width, m.height
         FROM carousel_items c
         LEFT JOIN media m ON c.media_id = m.id
         WHERE c.is_active = true
         ORDER BY c.display_order ASC`
      );
      res.json(result.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'خطا در دریافت اسلایدها' });
    }
  });

  // ایجاد/ویرایش carousel item
  app.post('/api/carousel', async (req, res) => {
    try {
      const { title, subtitle, description, media_id, link_url, link_text, display_order } = req.body;

      const result = await pool.query(
        `INSERT INTO carousel_items (title, subtitle, description, media_id, link_url, link_text, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [title, subtitle, description, media_id, link_url, link_text, display_order || 0]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'خطا در ایجاد اسلاید' });
    }
  });

  app.put('/api/carousel/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { title, subtitle, description, media_id, link_url, link_text, display_order } = req.body;

      const result = await pool.query(
        `UPDATE carousel_items 
         SET title = $1, subtitle = $2, description = $3, media_id = $4, 
             link_url = $5, link_text = $6, display_order = $7, updated_at = CURRENT_TIMESTAMP
         WHERE id = $8 RETURNING *`,
        [title, subtitle, description, media_id, link_url, link_text, display_order, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'اسلاید یافت نشد' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'خطا در ویرایش اسلاید' });
    }
  });

// --- بخش مدیریت کتگوری‌ها ---

// دریافت همه کتگوری‌ها
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categories ORDER BY name ASC'
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در دریافت کتگوری‌ها' });
  }
});

// دریافت یک کتگوری با slug
app.get('/api/categories/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM categories WHERE slug = $1',
      [slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'کتگوری یافت نشد' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در دریافت کتگوری' });
  }
});

// ایجاد کتگوری جدید
app.post('/api/categories', async (req, res) => {
  const { name, icon, image, parent_id, description, featured } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'نام کتگوری الزامی است' });
  }

  const slug = name.toLowerCase().replace(/\s+/g, '-');

  try {
    const result = await pool.query(
      `INSERT INTO categories (name, slug, icon, image, parent_id, description, featured) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, slug, icon, image, parent_id, description, featured || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'این کتگوری قبلاً ثبت شده است' });
    }
    console.error(err.message);
    res.status(500).json({ message: 'خطا در ایجاد کتگوری' });
  }
});

// ویرایش کتگوری
app.put('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name, icon, image, parent_id, description, featured } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'نام کتگوری الزامی است' });
  }

  const slug = name.toLowerCase().replace(/\s+/g, '-');

  try {
    const result = await pool.query(
      `UPDATE categories 
       SET name = $1, slug = $2, icon = $3, image = $4, 
           parent_id = $5, description = $6, featured = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [name, slug, icon, image, parent_id, description, featured, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'کتگوری یافت نشد' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در ویرایش کتگوری' });
  }
});

// حذف کتگوری
app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // ابتدا چک کنیم زیرمجموعه دارد یا نه
    const childCheck = await pool.query(
      'SELECT COUNT(*) FROM categories WHERE parent_id = $1',
      [id]
    );

    if (parseInt(childCheck.rows[0].count) > 0) {
      return res.status(400).json({
        message: 'این کتگوری دارای زیرمجموعه است و قابل حذف نیست'
      });
    }

    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'کتگوری یافت نشد' });
    }

    res.status(200).json({ message: 'کتگوری با موفقیت حذف شد' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در حذف کتگوری' });
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
// =================================================================
// ### اندپوینت‌های صفحه Gift-Shop ###
// =================================================================

// --- گرفتن محصولات فروشگاه کادویی (بر اساس تگ) ---
app.get('/api/gift-shop/products', async (req, res) => {
  const { tag } = req.query;

  try {
    let query;
    if (tag === 'popular') {
      // محصولات محبوب بر اساس امتیاز
      query = "SELECT * FROM products WHERE published = true AND 'هدیه' = ANY(categories) ORDER BY rating DESC LIMIT 10";
    } else if (tag === 'top-sailed') {
      // محصولات پرفروش (فعلا بر اساس جدیدترین‌ها شبیه‌سازی می‌کنیم)
      query = "SELECT * FROM products WHERE published = true AND 'هدیه' = ANY(categories) ORDER BY created_at DESC LIMIT 10";
    } else {
      // تمام محصولات کادویی
      query = "SELECT * FROM products WHERE published = true AND 'هدیه' = ANY(categories) LIMIT 20";
    }

    const result = await pool.query(query);
    res.status(200).json(result.rows.map(p => fixImageUrls(p)));
  } catch (err) {
    console.error(`Error fetching gift-shop products with tag ${tag}:`, err.message);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// ==== API ENDPOINTS برای CAROUSEL ====
// دریافت اسلایدهای carousel
app.get('/api/gift-shop/main-carousel', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM carousel_slides WHERE is_active = true ORDER BY sort_order ASC'
        );

        // تبدیل نام فیلدها به فرمت مورد نیاز frontend
        const carouselData = result.rows.map(slide => ({
            id: slide.id,
            title: slide.title,
            subTitle: slide.sub_title,
            buttonText: slide.button_text,
            buttonLink: slide.button_link,
            imgUrl: slide.img_url
        }));

        res.status(200).json(carouselData);
    } catch (err) {
        console.error('خطا در دریافت carousel slides:', err.message);
        res.status(500).json({ message: 'خطا در دریافت اسلایدها' });
    }
});

// --- منوی دسته‌بندی‌ها ---
app.get('/api/gift-shop-navigation', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, slug FROM categories WHERE parent_id IS NULL ORDER BY name ASC LIMIT 10"
    );

    // This is the simple list of categories from the database
    const categories = result.rows.map(cat => ({
      title: cat.name,
      href: `/products/search/${cat.slug}`
    }));

    // ✅ Create the nested structure the frontend component expects
    const navigationData = [{
      category: "دسته بندی ها",
      categoryItem: categories
    }];

    res.status(200).json(navigationData);

  } catch (err) {
    console.error('Error fetching gift shop navigation:', err.message);
    res.status(500).json({ message: 'Error fetching gift shop navigation' });
  }
});

// ==== API ENDPOINTS برای SERVICES ====
// --- لیست سرویس‌ها (از دیتابیس) ---
app.get('/api/gift-shop/service-list', async (req, res) => {
  try {
    // اول سعی می‌کنیم از دیتابیس بخونیم
    const result = await pool.query(
      'SELECT * FROM services WHERE is_active = true ORDER BY sort_order ASC'
    );

    if (result.rows.length > 0) {
      // اگر داده از دیتابیس گرفتیم
      const serviceList = result.rows.map(service => ({
        id: service.id,
        icon: service.icon,
        title: service.title,
        description: service.description
      }));
      res.status(200).json(serviceList);
    } else {
      // اگر جدول خالی بود، از داده‌های ثابت استفاده می‌کنیم
      const services = [
        { id: 1, icon: "Truck", title: "ارسال فوری", description: "کمتر از ۳ ساعت در تهران" },
        { id: 2, icon: "Gift", title: "کادوپیچی رایگان", description: "برای تمام سفارشات" },
        { id: 3, icon: "Payment", title: "پرداخت امن", description: "با درگاه معتبر بانکی" }
      ];
      res.status(200).json(services);
    }
  } catch (err) {
    // اگر جدول services وجود نداشت، از داده‌های ثابت استفاده می‌کنیم
    console.log('جدول services وجود ندارد، از داده‌های ثابت استفاده می‌شود');
    const services = [
      { id: 1, icon: "Truck", title: "ارسال فوری", description: "کمتر از ۳ ساعت در تهران" },
      { id: 2, icon: "Gift", title: "کادوپیچی رایگان", description: "برای تمام سفارشات" },
      { id: 3, icon: "Payment", title: "پرداخت امن", description: "با درگاه معتبر بانکی" }
    ];
    res.status(200).json(services);
  }
});

// ==== API ENDPOINTS برای SERVICES MANAGEMENT ====

// لیست تمام سرویس‌ها (برای ادمین)
app.get('/api/admin/services', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY sort_order ASC');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('خطا در دریافت services:', err.message);
    res.status(500).json({ message: 'خطا در دریافت سرویس‌ها' });
  }
});

// ایجاد سرویس جدید
app.post('/api/admin/services', async (req, res) => {
  const { icon, title, description, sortOrder, isActive } = req.body;

  if (!icon || !title) {
    return res.status(400).json({ message: 'آیکون و عنوان الزامی هستند.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO services (icon, title, description, sort_order, is_active) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [icon, title, description, sortOrder || 0, isActive !== false]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('خطا در ایجاد سرویس:', err.message);
    res.status(500).json({ message: 'خطا در ایجاد سرویس جدید' });
  }
});

// بروزرسانی سرویس
app.put('/api/admin/services/:id', async (req, res) => {
  const { id } = req.params;
  const { icon, title, description, sortOrder, isActive } = req.body;

  try {
    const result = await pool.query(
      `UPDATE services 
       SET icon = $1, title = $2, description = $3, sort_order = $4, is_active = $5
       WHERE id = $6 
       RETURNING *`,
      [icon, title, description, sortOrder, isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'سرویس پیدا نشد.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('خطا در بروزرسانی سرویس:', err.message);
    res.status(500).json({ message: 'خطا در بروزرسانی سرویس' });
  }
});

// حذف سرویس
app.delete('/api/admin/services/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM services WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'سرویس پیدا نشد.' });
    }

    res.status(200).json({ message: 'سرویس با موفقیت حذف شد.' });
  } catch (err) {
    console.error('خطا در حذف سرویس:', err.message);
    res.status(500).json({ message: 'خطا در حذف سرویس' });
  }
});

// ==== API ENDPOINTS برای CATEGORIES ====
// --- دسته‌بندی‌های برتر (بهبود یافته) ---
app.get('/api/gift-shop/top-categories', async (req, res) => {
  try {
    console.log('📋 شروع دریافت categories...');

    // اصلاح: از featured استفاده می‌کنیم (نه is_featured)
    const result = await pool.query(
      "SELECT * FROM categories WHERE featured = true ORDER BY id LIMIT 6"
    );

    console.log('📊 تعداد featured categories:', result.rows.length);

    if (result.rows.length > 0) {
      // اگر categories با featured=true پیدا کردیم
      const categories = result.rows.map(category => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        image: category.image || '/assets/images/Gift Shop/Product 1.png',
        description: category.description || `محصولات ${category.name}`
      }));
      res.status(200).json(categories);
    } else {
      // اگر هیچ featured category نبود، تمام categories رو برمی‌گردونیم
      console.log('⚠️ هیچ featured category نیست، همه رو برمی‌گردونیم');
      const fallbackResult = await pool.query("SELECT * FROM categories ORDER BY id LIMIT 6");

      const categories = fallbackResult.rows.map(category => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        image: category.image || '/assets/images/Gift Shop/Product 1.png',
        description: category.description || `محصولات ${category.name}`
      }));

      res.status(200).json(categories);
    }
  } catch (err) {
    console.error('❌ خطا در categories:', err.message);
    res.status(500).json({ message: 'Error fetching top categories', error: err.message });
  }
});

// ایجاد دسته‌بندی جدید (برای ادمین)
// ==== API ENDPOINTS برای CATEGORIES MANAGEMENT ====

// لیست تمام دسته‌بندی‌ها (برای ادمین)
app.get('/api/admin/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, 
             COUNT(p.id) as product_count
      FROM categories c 
      LEFT JOIN products p ON p.categories @> ARRAY[c.name]
      GROUP BY c.id 
      ORDER BY c.sort_order ASC, c.id ASC
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('خطا در دریافت categories:', err.message);
    res.status(500).json({ message: 'خطا در دریافت دسته‌بندی‌ها' });
  }
});

// ایجاد دسته‌بندی جدید
app.post('/api/admin/categories', async (req, res) => {
  const { name, slug, image, description, featured, sortOrder, parentId } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ message: 'نام و slug الزامی هستند.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO categories (name, slug, image, description, featured, sort_order, parent_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [name, slug, image, description, featured || false, sortOrder || 0, parentId || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // unique constraint violation
      return res.status(409).json({ message: 'این slug قبلاً استفاده شده است.' });
    }
    console.error('خطا در ایجاد دسته‌بندی:', err.message);
    res.status(500).json({ message: 'خطا در ایجاد دسته‌بندی جدید' });
  }
});

// بروزرسانی دسته‌بندی
app.put('/api/admin/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name, slug, image, description, featured, sortOrder, parentId } = req.body;

  try {
    const result = await pool.query(
      `UPDATE categories 
       SET name = $1, slug = $2, image = $3, description = $4, 
           featured = $5, sort_order = $6, parent_id = $7
       WHERE id = $8 
       RETURNING *`,
      [name, slug, image, description, featured, sortOrder, parentId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'دسته‌بندی پیدا نشد.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'این slug قبلاً استفاده شده است.' });
    }
    console.error('خطا در بروزرسانی دسته‌بندی:', err.message);
    res.status(500).json({ message: 'خطا در بروزرسانی دسته‌بندی' });
  }
});

// حذف دسته‌بندی
app.delete('/api/admin/categories/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // چک کن که آیا محصولی در این دسته‌بندی هست
    const productCheck = await pool.query(
      "SELECT COUNT(*) FROM products WHERE categories @> ARRAY[(SELECT name FROM categories WHERE id = $1)]",
      [id]
    );

    if (parseInt(productCheck.rows[0].count) > 0) {
      return res.status(400).json({
        message: 'نمی‌توان دسته‌بندی‌ای را حذف کرد که محصول دارد.'
      });
    }

    const result = await pool.query('DELETE FROM categories WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'دسته‌بندی پیدا نشد.' });
    }

    res.status(200).json({ message: 'دسته‌بندی با موفقیت حذف شد.' });
  } catch (err) {
    console.error('خطا در حذف دسته‌بندی:', err.message);
    res.status(500).json({ message: 'خطا در حذف دسته‌بندی' });
  }
});

// ==== API ENDPOINTS برای BANNER MANAGEMENT ====

// دریافت تمام banners
app.get('/api/admin/banners', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM banners ORDER BY display_order ASC, id ASC');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('خطا در دریافت banners:', err.message);
    res.status(500).json({ message: 'خطا در دریافت بنرها' });
  }
});

// دریافت banners فعال برای frontend
app.get('/api/gift-shop/banners', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM banners WHERE is_active = true ORDER BY display_order ASC'
    );

    // گروه‌بندی بر اساس نوع
    const banners = {
      offer_left: result.rows.find(b => b.type === 'offer_left'),
      offer_right: result.rows.find(b => b.type === 'offer_right'),
      summer: result.rows.find(b => b.type === 'summer')
    };

    res.status(200).json(banners);
  } catch (err) {
    console.error('خطا در دریافت banners:', err.message);
    res.status(500).json({ message: 'خطا در دریافت بنرها' });
  }
});

// ایجاد banner جدید
app.post('/api/admin/banners', async (req, res) => {
  const { name, type, title, subtitle, description, buttonText, buttonLink, imageUrl, displayOrder } = req.body;

  if (!name || !type) {
    return res.status(400).json({ message: 'نام و نوع بنر الزامی هستند.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO banners (name, type, title, subtitle, description, button_text, button_link, image_url, display_order) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [name, type, title, subtitle, description, buttonText, buttonLink, imageUrl, displayOrder || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('خطا در ایجاد banner:', err.message);
    res.status(500).json({ message: 'خطا در ایجاد بنر جدید' });
  }
});

// بروزرسانی banner
app.put('/api/admin/banners/:id', async (req, res) => {
  const { id } = req.params;
  const { name, type, title, subtitle, description, buttonText, buttonLink, imageUrl, displayOrder, isActive } = req.body;

  try {
    const result = await pool.query(
      `UPDATE banners 
       SET name = $1, type = $2, title = $3, subtitle = $4, description = $5, 
           button_text = $6, button_link = $7, image_url = $8, display_order = $9, is_active = $10
       WHERE id = $11 
       RETURNING *`,
      [name, type, title, subtitle, description, buttonText, buttonLink, imageUrl, displayOrder, isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'بنر پیدا نشد.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('خطا در بروزرسانی banner:', err.message);
    res.status(500).json({ message: 'خطا در بروزرسانی بنر' });
  }
});

// حذف banner
app.delete('/api/admin/banners/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM banners WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'بنر پیدا نشد.' });
    }

    res.status(200).json({ message: 'بنر با موفقیت حذف شد.' });
  } catch (err) {
    console.error('خطا در حذف banner:', err.message);
    res.status(500).json({ message: 'خطا در حذف بنر' });
  }
});

// =================================================================
// ### اندپوینت‌های صفحه Fashion-3 ###
// =================================================================

// --- گرفتن محصولات بر اساس تگ (ویژه یا بهترین) ---
app.get('/api/fashion-3/products', async (req, res) => {
  const { tag } = req.query; // خواندن تگ از آدرس ?tag=...

  try {
    let query;
    if (tag === 'best') {
      // برای محصولات "بهترین"، بر اساس امتیاز مرتب می‌کنیم
      query = "SELECT * FROM products WHERE published = true AND 'fashion' = ANY(categories) ORDER BY rating DESC LIMIT 8";
    } else {
      // برای بقیه موارد (مثل "ویژه")، بر اساس تاریخ اضافه شدن مرتب می‌کنیم
      query = "SELECT * FROM products WHERE published = true AND 'fashion' = ANY(categories) ORDER BY created_at DESC LIMIT 8";
    }

    const result = await pool.query(query);
    res.status(200).json(result.rows.map(p => fixImageUrls(p)));

  } catch (err) {
    console.error(`Error fetching fashion-3 products with tag ${tag}:`, err.message);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// --- داده‌های اسلایدر اصلی ---
app.get('/api/fashion-3/main-carousel', (req, res) => {
  const carouselData = [
    {
      id: "1",
      title: "فشن زنانه",
      imgUrl: "/assets/images/products/fashion-3-banner-1.png",
      description: "تا ۴۰٪ تخفیف برای کلکسیون جدید",
      buttonText: "خرید کنید"
    },
    {
      id: "2",
      title: "فشن مردانه",
      imgUrl: "/assets/images/products/fashion-3-banner-2.png",
      description: "جدیدترین مدل‌های فصل",
      buttonText: "مشاهده"
    }
  ];
  res.status(200).json(carouselData);
});

// --- لیست سرویس‌ها ---
app.get('/api/fashion-3/services', (req, res) => {
  const services = [
    { id: "1", icon: "Truck", title: "ارسال سریع", description: "برای سفارشات بالای ۱ میلیون تومان" },
    { id: "2", icon: "MoneyGuarantee", title: "ضمانت بازگشت وجه", description: "تا ۷ روز پس از تحویل" },
    { id: "3", icon: "Payment", title: "پرداخت امن", description: "با تمام کارت‌های عضو شتاب" }
  ];
  res.status(200).json(services);
});

// --- لیست مقالات وبلاگ (داده ثابت) ---
app.get('/api/fashion-3/blogs', (req, res) => {
  const blogs = [
    { id: 1, title: "چطور استایل شخصی خود را پیدا کنیم؟", thumbnail: "/assets/images/products/blog-1.png", createdAt: "2024-05-10" },
    { id: 2, title: "رنگ سال ۲۰۲۵ و تاثیر آن بر مد", thumbnail: "/assets/images/products/blog-2.png", createdAt: "2024-04-22" },
  ];
  res.status(200).json(blogs);
});

// --- لیست برندها ---
app.get('/api/fashion-3/brands', async (req, res) => {
  try {
    const result = await pool.query("SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND 'fashion' = ANY(categories) LIMIT 10");
    // خروجی دیتابیس به شکل { brand: 'پوما' } است، ما آن را به فرمت مناسب تبدیل می‌کنیم
    const formattedBrands = result.rows.map((row, i) => ({ id: i, name: row.brand, slug: row.brand, image: `/assets/images/brands/${row.brand.toLowerCase()}.png` }));
    res.status(200).json(formattedBrands);
  } catch (err) { res.status(500).json({ message: 'Error fetching brands' }); }
});

// ========================================================================
// ### بخش یکپارچه مدیریت رسانه (Media Endpoints) ###
// ========================================================================

// ========================= PRODUCT MEDIA ENDPOINTS =========================

// دریافت تصاویر یک محصول
app.get('/api/products/:productId/media', async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(
      `SELECT pm.*, m.* FROM product_media pm
       JOIN media m ON pm.media_id = m.id
       WHERE pm.product_id = $1 AND m.deleted_at IS NULL
       ORDER BY pm.is_primary DESC, pm.display_order ASC`,
      [productId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در دریافت تصاویر محصول' });
  }
});

// افزودن تصویر به محصول
app.post('/api/products/:productId/media', async (req, res) => {
  try {
    const { productId } = req.params;
    const { media_id, is_primary = false, display_order = 0 } = req.body;
    if (is_primary) {
      await pool.query('UPDATE product_media SET is_primary = false WHERE product_id = $1', [productId]);
    }
    const result = await pool.query(
      `INSERT INTO product_media (product_id, media_id, is_primary, display_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [productId, media_id, is_primary, display_order]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در افزودن تصویر به محصول' });
  }
});

// حذف همه تصاویر یک محصول
app.delete('/api/products/:productId/media', async (req, res) => {
  try {
    const { productId } = req.params;
    await pool.query('DELETE FROM product_media WHERE product_id = $1', [productId]);
    res.json({ message: 'تصاویر محصول حذف شدند' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در حذف تصاویر محصول' });
  }
});

// حذف یک تصویر خاص از محصول
app.delete('/api/products/:productId/media/:mediaId', async (req, res) => {
  try {
    const { productId, mediaId } = req.params;
    const result = await pool.query(
      'DELETE FROM product_media WHERE product_id = $1 AND media_id = $2 RETURNING *',
      [productId, mediaId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'ارتباط تصویر با محصول یافت نشد' });
    res.json({ message: 'تصویر از محصول حذف شد' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در حذف تصویر از محصول' });
  }
});

// تنظیم تصویر اصلی محصول
app.put('/api/products/:productId/media/:mediaId/primary', async (req, res) => {
  try {
    const { productId, mediaId } = req.params;
    await pool.query('UPDATE product_media SET is_primary = false WHERE product_id = $1', [productId]);
    const result = await pool.query(
      'UPDATE product_media SET is_primary = true WHERE product_id = $1 AND media_id = $2 RETURNING *',
      [productId, mediaId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'ارتباط تصویر با محصول یافت نشد' });
    res.json({ message: 'تصویر اصلی تنظیم شد' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در تنظیم تصویر اصلی' });
  }
});

// ========================= CATEGORY MEDIA ENDPOINTS =========================

// دریافت تصویر یک دسته‌بندی
app.get('/api/categories/:categoryId/media', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const result = await pool.query(
      `SELECT c.*, m.* FROM categories c
       LEFT JOIN media m ON c.media_id = m.id
       WHERE c.id = $1 AND (m.deleted_at IS NULL OR m.deleted_at IS NULL)`,
      [categoryId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'دسته‌بندی یافت نشد' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در دریافت تصویر دسته‌بندی' });
  }
});

// تنظیم تصویر دسته‌بندی
app.put('/api/categories/:categoryId/media', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { media_id } = req.body;
    const result = await pool.query(
      'UPDATE categories SET media_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [media_id, categoryId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'دسته‌بندی یافت نشد' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در تنظیم تصویر دسته‌بندی' });
  }
});

// ========================= BANNER MEDIA ENDPOINTS =========================

// دریافت لیست بنرها
app.get('/api/banners', async (req, res) => {
  try {
    const { banner_type = '' } = req.query;
    let whereClause = 'WHERE bm.is_active = true AND m.deleted_at IS NULL';
    const queryParams = [];
    if (banner_type) {
      queryParams.push(banner_type);
      whereClause += ` AND bm.banner_type = $${queryParams.length}`;
    }
    const result = await pool.query(
      `SELECT bm.*, m.file_url, m.alt_text, m.width, m.height
       FROM banner_media bm
       JOIN media m ON bm.media_id = m.id
       ${whereClause}
       ORDER BY bm.display_order ASC`,
      queryParams
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در دریافت بنرها' });
  }
});

// ایجاد بنر جدید
app.post('/api/banners', async (req, res) => {
  try {
    const { media_id, banner_type, display_order = 0 } = req.body;
    const result = await pool.query(
      `INSERT INTO banner_media (media_id, banner_type, display_order)
       VALUES ($1, $2, $3) RETURNING *`,
      [media_id, banner_type, display_order]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در ایجاد بنر' });
  }
});

// ویرایش بنر
app.put('/api/banners/:bannerId', async (req, res) => {
  try {
    const { bannerId } = req.params;
    const { media_id, banner_type, display_order, is_active } = req.body;
    const result = await pool.query(
      `UPDATE banner_media 
       SET media_id = $1, banner_type = $2, display_order = $3, is_active = $4
       WHERE id = $5 RETURNING *`,
      [media_id, banner_type, display_order, is_active, bannerId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'بنر یافت نشد' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در ویرایش بنر' });
  }
});

// حذف بنر
app.delete('/api/banners/:bannerId', async (req, res) => {
  try {
    const { bannerId } = req.params;
    const result = await pool.query('DELETE FROM banner_media WHERE id = $1 RETURNING *', [bannerId]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'بنر یافت نشد' });
    res.json({ message: 'بنر حذف شد' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در حذف بنر' });
  }
});

// ========================= MEDIA USAGE ENDPOINTS =========================

// دریافت آمار استفاده از یک فایل رسانه
app.get('/api/media/:mediaId/usage', async (req, res) => {
  try {
    const { mediaId } = req.params;
    const carouselUsage = await pool.query('SELECT COUNT(*) as count FROM carousel_items WHERE media_id = $1', [mediaId]);
    const productUsage = await pool.query('SELECT COUNT(*) as count FROM product_media WHERE media_id = $1', [mediaId]);
    const categoryUsage = await pool.query('SELECT COUNT(*) as count FROM categories WHERE media_id = $1', [mediaId]);
    const bannerUsage = await pool.query('SELECT COUNT(*) as count FROM banner_media WHERE media_id = $1', [mediaId]);
    const usage = {
      carousel: parseInt(carouselUsage.rows[0].count),
      products: parseInt(productUsage.rows[0].count),
      categories: parseInt(categoryUsage.rows[0].count),
      banners: parseInt(bannerUsage.rows[0].count),
      total: parseInt(carouselUsage.rows[0].count) +
             parseInt(productUsage.rows[0].count) +
             parseInt(categoryUsage.rows[0].count) +
             parseInt(bannerUsage.rows[0].count)
    };
    res.json(usage);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در دریافت آمار استفاده' });
  }
});

// دریافت جزئیات استفاده از یک فایل رسانه
app.get('/api/media/:mediaId/usage/details', async (req, res) => {
  try {
    const { mediaId } = req.params;
    const details = { carousel: [], products: [], categories: [], banners: [] };
    const carouselResult = await pool.query('SELECT id, title FROM carousel_items WHERE media_id = $1', [mediaId]);
    details.carousel = carouselResult.rows;
    const productResult = await pool.query(
      `SELECT p.id, p.name, pm.is_primary FROM products p JOIN product_media pm ON p.id = pm.product_id WHERE pm.media_id = $1`,
      [mediaId]
    );
    details.products = productResult.rows;
    const categoryResult = await pool.query('SELECT id, name FROM categories WHERE media_id = $1', [mediaId]);
    details.categories = categoryResult.rows;
    const bannerResult = await pool.query('SELECT id, banner_type FROM banner_media WHERE media_id = $1', [mediaId]);
    details.banners = bannerResult.rows;
    res.json(details);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'خطا در دریافت جزئیات استفاده' });
  }
});

// ========================= NEW & IMPROVED MEDIA ENDPOINTS =========================

// ✅ اندپوینت بهبودیافته برای دریافت لیست فایل‌های مدیا با قابلیت جستجو، فیلتر و صفحه‌بندی
app.get('/api/media', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', mimeType = '', sortBy = 'created_at', sortOrder = 'desc' } = req.query;
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE deleted_at IS NULL';
    const queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND (original_name ILIKE $${paramCount} OR title ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (mimeType) {
      paramCount++;
      whereClause += ` AND mime_type LIKE $${paramCount}`;
      queryParams.push(`${mimeType}%`);
    }

    const allowedSortFields = ['created_at', 'original_name', 'file_size', 'mime_type'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const mainQueryParams = [...queryParams, parseInt(limit), offset];
    const query = `
      SELECT id, filename, original_name, file_url, file_size, mime_type, 
             alt_text, title, caption, width, height, created_at, updated_at
      FROM media 
      ${whereClause}
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    const result = await pool.query(query, mainQueryParams);

    const countQuery = `SELECT COUNT(*) FROM media ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error('❌ Error fetching media files:', err.message);
    if (err.message.includes('relation "media" does not exist')) {
      return res.json({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        warning: 'جدول media هنوز ایجاد نشده است'
      });
    }
    res.status(500).json({ message: 'خطا در دریافت فایل‌ها' });
  }
});

// ✅ API برای دریافت آمار فایل‌های media
app.get('/api/media/stats', async (req, res) => {
  try {
    const totalFilesResult = await pool.query('SELECT COUNT(*) as count FROM media WHERE deleted_at IS NULL');
    const totalSizeResult = await pool.query('SELECT SUM(file_size) as total_size FROM media WHERE deleted_at IS NULL');
    const imageFilesResult = await pool.query("SELECT COUNT(*) as count FROM media WHERE deleted_at IS NULL AND mime_type LIKE 'image/%'");
    const videoFilesResult = await pool.query("SELECT COUNT(*) as count FROM media WHERE deleted_at IS NULL AND mime_type LIKE 'video/%'");

    const totalFiles = parseInt(totalFilesResult.rows[0].count);
    const totalSize = parseInt(totalSizeResult.rows[0].total_size || 0);
    const imageFiles = parseInt(imageFilesResult.rows[0].count);
    const videoFiles = parseInt(videoFilesResult.rows[0].count);
    // ... (سایر انواع فایل‌ها را می‌توان به همین شکل اضافه کرد)

    const recentUploadsResult = await pool.query(
      `SELECT id, filename, original_name, file_url, file_size, mime_type, created_at 
       FROM media 
       WHERE deleted_at IS NULL 
       ORDER BY created_at DESC 
       LIMIT 5`
    );

    const stats = {
      totalFiles,
      totalSize,
      storageUsed: totalSize,
      storageLimit: 1000000000, // 1GB limit
      storageUsedPercentage: Math.round((totalSize / 1000000000) * 100),
      categories: {
        images: imageFiles,
        videos: videoFiles,
        others: totalFiles - (imageFiles + videoFiles)
      },
      recentUploads: recentUploadsResult.rows
    };
    res.json(stats);
  } catch (err) {
    console.error('❌ Error fetching media stats:', err.message);
    if (err.message.includes('relation "media" does not exist')) {
      // Return sample stats if table doesn't exist
      return res.json({ /* ... sample stats object ... */ });
    }
    res.status(500).json({ message: 'خطا در دریافت آمار فایل‌ها' });
  }
});

// ✅ API برای دریافت لاگ فعالیت‌های media
app.get('/api/media/activity', async (req, res) => {
  try {
    // Fallback to media table if activity log table doesn't exist
    const mediaEvents = await pool.query(
      `SELECT id, 'upload' as action, original_name as file_name, id as file_id, 
              uploaded_by as user_id, created_at as timestamp, 'فایل آپلود شد' as details
       FROM media 
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC 
       LIMIT 20`
    );
    const activities = mediaEvents.rows.map(activity => ({
      id: activity.id,
      action: activity.action,
      fileName: activity.file_name,
      fileId: activity.file_id,
      userId: activity.user_id || 1,
      timestamp: activity.timestamp,
      details: activity.details,
      ipAddress: null
    }));
    res.json({
      activities,
      total: activities.length,
      note: 'فعالیت‌ها از جدول media استخراج شده‌اند'
    });
  } catch (err) {
    console.error('❌ Error fetching media activity:', err.message);
    if (err.message.includes('relation "media" does not exist')) {
      // Return sample activity if table doesn't exist
      return res.json({ /* ... sample activity object ... */ });
    }
    res.status(500).json({ message: 'خطا در دریافت لاگ فعالیت‌ها' });
  }
});

// =================================================================
// ### اندپوینت‌های صفحه Market-1 ###
// =================================================================

// در فایل server.js یا فایل اصلی بک‌اند

app.get('/api/market-1/main-carousel', (req, res) => {
  // فعلا داده‌های ثابت را برمی‌گردانیم تا اتصال تست شود
  // بعدا می‌توانید این داده‌ها را از دیتابیس بخوانید
  const mainCarouselData = [
    {
      id: 1,
      title: "لوازم الکترونیکی",
      description: "تا ۳۰٪ تخفیف",
      imgUrl: "/assets/images/carousel/banner-1.jpg",
      buttonText: "همین حالا خرید کنید",
      buttonLink: "/products/search/electronics"
    },
    {
      id: 2,
      title: "مد و پوشاک",
      description: "جدیدترین‌های فصل",
      imgUrl: "/assets/images/carousel/banner-2.jpg",
      buttonText: "مشاهده",
      buttonLink: "/products/search/fashion"
    }
  ];

  res.status(200).json(mainCarouselData);
});

// در فایل server.js
app.get('/api/market-1/flash-deals', async (req, res) => {
  try {
    // به جای داده ثابت، این بار محصولات واقعی که تخفیف دارند را از دیتابیس می‌خوانیم
    const query = `
      SELECT * FROM products 
      WHERE discount > 0 AND published = true 
      ORDER BY created_at DESC 
      LIMIT 8
    `;
    const result = await pool.query(query);

    // اگر تابع fixImageUrls را دارید، از آن استفاده کنید
    const productsWithFixedUrls = result.rows.map(product => fixImageUrls(product));

    res.status(200).json(productsWithFixedUrls);
  } catch (err) {
    console.error('Error fetching flash deals:', err.message);
    res.status(500).json({ message: 'خطا در دریافت محصولات فروش ویژه' });
  }
});

// --- محصولات برتر (بر اساس امتیاز) ---
app.get('/api/market-1/toprated-product', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products WHERE published = true ORDER BY rating DESC LIMIT 10");
    res.status(200).json(result.rows.map(p => fixImageUrls(p)));
  } catch (err) { res.status(500).json({ message: 'Error fetching top-rated products' }); }
});

// --- برندهای برتر ---
app.get('/api/market-1/toprated-brand', async (req, res) => {
  try {
    const result = await pool.query("SELECT brand, COUNT(*) as product_count FROM products WHERE brand IS NOT NULL AND brand != '' GROUP BY brand ORDER BY product_count DESC LIMIT 10");
    res.status(200).json(result.rows);
  } catch (err) { res.status(500).json({ message: 'Error fetching top-rated brands' }); }
});

// --- محصولات جدید ---
app.get('/api/market-1/new-arrivals', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products WHERE published = true ORDER BY created_at DESC LIMIT 10");
    res.status(200).json(result.rows.map(p => fixImageUrls(p)));
  } catch (err) { res.status(500).json({ message: 'Error fetching new arrivals' }); }
});

// --- لیست محصولات با تخفیف زیاد ---
app.get('/api/market-1/big-discounts', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products WHERE published = true AND discount > 20 ORDER BY discount DESC LIMIT 10");
    res.status(200).json(result.rows.map(p => fixImageUrls(p)));
  } catch (err) { res.status(500).json({ message: 'Error fetching big discounts' }); }
});

// --- دسته‌بندی‌های برتر ---
app.get('/api/market-1/top-categories', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories LIMIT 8");
    res.status(200).json(result.rows);
  } catch (err) { res.status(500).json({ message: 'Error fetching top categories' }); }
});

// --- دسته‌بندی‌های پایین صفحه ---
app.get('/api/market-1/bottom-categories', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories WHERE parent_id IS NOT NULL LIMIT 8");
    res.status(200).json(result.rows);
  } catch (err) { res.status(500).json({ message: 'Error fetching bottom categories' }); }
});


// --- بخش‌های خاص (ماشین، موبایل و ...) ---
// برای این بخش‌ها، فرض می‌کنیم از دسته‌بندی‌ها برای فیلتر کردن استفاده می‌کنیم.

app.get('/api/market-1/car-list', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products WHERE 'Cars' = ANY(categories) AND published = true LIMIT 10");
    res.status(200).json(result.rows.map(p => fixImageUrls(p)));
  } catch (err) { res.status(500).json({ message: 'Error fetching car list' }); }
});

app.get('/api/market-1/car-brand-list', async (req, res) => {
  try {
    const result = await pool.query("SELECT DISTINCT brand FROM products WHERE 'Cars' = ANY(categories) AND brand IS NOT NULL LIMIT 10");
    res.status(200).json(result.rows);
  } catch (err) { res.status(500).json({ message: 'Error fetching car brands' }); }
});

app.get('/api/market-1/mobile-list', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products WHERE 'Mobiles' = ANY(categories) AND published = true LIMIT 10");
    res.status(200).json(result.rows.map(p => fixImageUrls(p)));
  } catch (err) { res.status(500).json({ message: 'Error fetching mobile list' }); }
});

app.get('/api/market-1/mobile-brand-list', async (req, res) => {
  try {
    const result = await pool.query("SELECT DISTINCT brand FROM products WHERE 'Mobiles' = ANY(categories) AND brand IS NOT NULL LIMIT 10");
    res.status(200).json(result.rows);
  } catch (err) { res.status(500).json({ message: 'Error fetching mobile brands' }); }
});


app.get('/api/market-1/optics-list', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products WHERE 'Optics' = ANY(categories) AND published = true LIMIT 10");
    res.status(200).json(result.rows.map(p => fixImageUrls(p)));
  } catch (err) { res.status(500).json({ message: 'Error fetching optics list' }); }
});

app.get('/api/market-1/optics/watch-brands', async (req, res) => {
  try {
    const result = await pool.query("SELECT DISTINCT brand FROM products WHERE 'Optics' = ANY(categories) AND brand IS NOT NULL LIMIT 10");
    res.status(200).json(result.rows);
  } catch (err) { res.status(500).json({ message: 'Error fetching optics brands' }); }
});

// --- اندپوینت‌های با داده ثابت (چون جدولشان در دیتابیس نیست) ---

app.get('/api/market-1/mobile-shop-list', (req, res) => {
    res.status(200).json(["Apple Store", "Samsung Plaza", "Mobile World", "Gadget Hub"]);
});

app.get('/api/market-1/optics/watch-shops', (req, res) => {
    res.status(200).json(["Time Zone", "Watch Gallery", "The Horologists", "Luxury Watches"]);
});

app.get('/api/market-1/get-more-items', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products WHERE published = true ORDER BY RANDOM() LIMIT 10");
    res.status(200).json(result.rows.map(p => fixImageUrls(p)));
  } catch (err) { res.status(500).json({ message: 'Error fetching more items' }); }
});

app.get('/api/market-1/get-service-list', (req, res) => {
  res.status(200).json([
      { id: 1, icon: "Truck", title: "Fast Delivery", description: "Start from $10" },
      { id: 2, icon: "MoneyGuarantee", title: "Money Guarantee", description: "7 Days Back" },
      { id: 3, icon: "AlarmClock", title: "365 Days", description: "For free return" },
      { id: 4, icon: "Payment", title: "Payment", description: "Secure system" }
  ]);
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
// ========================= DATABASE SCHEMA UPDATE =========================
const updateMediaTable = async () => {
  try {
    // اضافه کردن ستون thumbnails اگر وجود ندارد
    await pool.query(`
      ALTER TABLE media 
      ADD COLUMN IF NOT EXISTS thumbnails JSONB DEFAULT '{}'::jsonb
    `);
    console.log('✅ Media table updated successfully');
  } catch (error) {
    console.log('⚠️ Media table update info:', error.message);
  }
};

// ========================= INITIALIZATION =========================
// اطمینان از وجود پوشه‌ها و بروزرسانی دیتابیس هنگام شروع سرور
const initializeServer = async () => {
  await ensureDirectories();
  await updateMediaTable();
};

// فراخوانی initialization
initializeServer();

// --- شروع سرور ---
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});