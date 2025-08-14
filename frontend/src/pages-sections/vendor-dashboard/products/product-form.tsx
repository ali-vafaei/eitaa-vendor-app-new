"use client";

import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { Formik } from "formik";
import * as yup from "yup";
import Alert from "@mui/material/Alert";
// GLOBAL CUSTOM COMPONENTS
import DropZone from "components/DropZone";
import { FlexBox } from "components/flex-box";
// STYLED COMPONENTS
import { UploadImageBox, StyledClear } from "../styles";

// FORM FIELDS VALIDATION SCHEMA
const VALIDATION_SCHEMA = yup.object().shape({
  name: yup.string().required("Name is required!"),
  category: yup.array(yup.string()).optional(),
  description: yup.string().optional(),
  stock: yup.number().required("Stock is required!"),
  price: yup.number().required("Price is required!"),
  sale_price: yup.number().optional(),
  brand: yup.string().optional(),
});

// ================================================================
interface Props {
  productToEdit?: any;
  onSave: (product: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}
// ================================================================

export default function ProductForm({ productToEdit, onSave, onCancel, isSubmitting: externalSubmitting }: Props) {
  const [apiError, setApiError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // ✨ State برای نگهداری لیست کتگوری‌ها
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const INITIAL_VALUES = {
    name: productToEdit?.name || "",
    brand: productToEdit?.brand || "",
    stock: productToEdit?.stock || "",
    price: productToEdit?.price || "",
    category: productToEdit?.categories || [],
    sale_price: productToEdit?.sale_price || "",
    description: productToEdit?.description || "",
    thumbnail: productToEdit?.thumbnail || "",
    slug: productToEdit?.slug || "",
    published: productToEdit?.published ?? true,
  };

  // ✨ دریافت لیست کتگوری‌ها از بک‌اند
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await fetch('http://localhost:4000/api/categories');

        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }

        const data = await response.json();
        console.log('📂 Categories loaded:', data);
        setCategories(data || []);
      } catch (error) {
        console.error('❌ Error fetching categories:', error);
        setCategories([]);
        // در صورت خطا، از کتگوری‌های پیش‌فرض استفاده کن
        setCategories([
          { id: 'electronics', name: 'Electronics' },
          { id: 'fashion', name: 'Fashion' },
          { id: 'beauty', name: 'Beauty' },
          { id: 'sports', name: 'Sports' },
          { id: 'books', name: 'Books' }
        ]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // ✨ بارگذاری عکس‌های موجود هنگام ویرایش
  useEffect(() => {
    if (productToEdit && productToEdit.images) {
      const images = Array.isArray(productToEdit.images)
        ? productToEdit.images
        : [productToEdit.images];

      setExistingImages(images.filter(img => img && img.trim() !== ''));
      console.log('📸 Loaded existing images:', images);
    }
  }, [productToEdit]);

  // ✨ تابع تولید slug منحصر به فرد
  const generateUniqueSlug = (name: string): string => {
    if (!name || name.trim() === '') {
      return `product-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    }
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // حذف کاراکترهای خاص
      .replace(/\s+/g, '-')         // جایگزینی space با -
      .replace(/-+/g, '-')          // حذف - های تکراری
      .replace(/^-|-$/g, '');       // حذف - از ابتدا و انتها

    const timestamp = Date.now();
    const randomNum = Math.random().toString(36).substr(2, 5);
    return `${baseSlug || 'product'}-${timestamp}-${randomNum}`;
  };

  const handleFormSubmit = async (values: any, { setSubmitting }: any) => {
    // ✨ جلوگیری از double submit
    if (isSubmittingForm) {
      console.log('🛑 Form already submitting, ignoring...');
      return;
    }

    console.log('🚀 Form submit started...');
    console.log('📋 Form values:', values);
    console.log('📁 New files:', files.length);
    console.log('📸 Existing images:', existingImages.length);

    setIsSubmittingForm(true);
    setApiError("");
    setSubmitting(true);
    const isEditing = !!productToEdit;

    try {
      let allImageUrls = []; // آرایه نهایی همه عکس‌ها
      let thumbnailUrl = values.thumbnail; // عکس اصلی محصول
      let newImageUrls = []; // عکس‌های جدید آپلود شده

      console.log('📸 Starting image processing...');

      // مرحله ۱: شروع با عکس‌های موجود (که کاربر حذف نکرده)
      if (existingImages.length > 0) {
        allImageUrls = [...existingImages];
        console.log('📸 Added existing images:', allImageUrls.length);
      }

      // مرحله ۲: آپلود فایل‌های جدید (اگر وجود دارند)
      if (files && files.length > 0) {
        console.log(`🚀 Uploading ${files.length} new image files...`);
        console.log('📁 Files to upload:', files.map(f => f.name));

        const formData = new FormData();
        files.forEach((file, index) => {
          formData.append('images', file);
          console.log(`📤 Adding file ${index + 1}: ${file.name} (${file.size} bytes)`);
        });

        console.log('📤 FormData created, sending to backend...');

        const uploadResponse = await fetch('http://localhost:4000/api/upload-multiple', {
          method: 'POST',
          body: formData,
        });

        console.log('📡 Upload response status:', uploadResponse.status);

        const uploadResult = await uploadResponse.json();
        console.log('📡 Upload result:', uploadResult);

        if (!uploadResponse.ok) {
          throw new Error(uploadResult.error || 'خطا در آپلود عکس‌ها');
        }

        // اضافه کردن URL های جدید به متغیر و لیست کل
        newImageUrls = uploadResult.imageUrls || [];
        allImageUrls = [...allImageUrls, ...newImageUrls];

        console.log('✅ New images uploaded:', newImageUrls.length);
        console.log('🎯 New uploaded URLs:', newImageUrls);
        console.log('📸 Total images after upload:', allImageUrls.length);
        console.log('📋 All image URLs:', allImageUrls);
      }

      // مرحله ۳: اضافه کردن URL دستی (اگر وجود دارد و تکراری نیست)
      if (values.thumbnail && values.thumbnail.trim() !== '' && !allImageUrls.includes(values.thumbnail)) {
        allImageUrls = [values.thumbnail, ...allImageUrls];
        console.log('📸 Added manual URL to images');
      }

      // مرحله ۴: تعیین thumbnail نهایی - منطق اصلاح شده
      console.log('🎯 Determining thumbnail logic...');
      console.log('📝 Form thumbnail field:', values.thumbnail);
      console.log('📁 New files uploaded:', files.length);
      console.log('🆕 New image URLs count:', newImageUrls.length);
      console.log('📸 Existing images:', existingImages.length);

      if (newImageUrls.length > 0) {
        // ✨ اولویت اول: اگر عکس جدید آپلود شده، آخرین عکس جدید رو thumbnail کن
        thumbnailUrl = newImageUrls[newImageUrls.length - 1]; // آخرین عکس جدید
        console.log('🆕 Using latest uploaded image as thumbnail:', thumbnailUrl);
        console.log('🎯 Selected from', newImageUrls.length, 'new images');

      } else if (values.thumbnail && values.thumbnail.trim() !== '' && !values.thumbnail.includes('placeholder')) {
        // اولویت دوم: اگر کاربر دستی thumbnail معتبر وارد کرده
        thumbnailUrl = values.thumbnail;
        console.log('✅ Using manual thumbnail:', thumbnailUrl);

      } else if (existingImages.length > 0) {
        // اولویت سوم: اگر هیچ عکس جدیدی آپلود نشده، از آخرین عکس موجود استفاده کن
        thumbnailUrl = existingImages[existingImages.length - 1]; // آخرین عکس موجود
        console.log('📸 Using latest existing image as thumbnail:', thumbnailUrl);

      } else if (allImageUrls.length > 0) {
        // اولویت چهارم: fallback - از آخرین عکس در کل لیست استفاده کن
        thumbnailUrl = allImageUrls[allImageUrls.length - 1];
        console.log('🔄 Using latest from all images as thumbnail:', thumbnailUrl);

      } else if (isEditing && productToEdit?.thumbnail && !productToEdit.thumbnail.includes('placeholder')) {
        // اولویت پنجم: در نهایت از thumbnail قدیمی استفاده کن (اگر placeholder نباشه)
        thumbnailUrl = productToEdit.thumbnail;
        console.log('🔙 Using existing product thumbnail:', thumbnailUrl);

      } else {
        // آخرین گزینه: اگر هیچکدوم موجود نبود، یه thumbnail پیش‌فرض بساز
        thumbnailUrl = `https://via.placeholder.com/300.png?text=${encodeURIComponent(values.name)}`;
        console.log('🎭 Using placeholder thumbnail:', thumbnailUrl);
      }

      console.log('✅ Final thumbnail selected:', thumbnailUrl);

      // بررسی وجود حداقل یک عکس
      if (!thumbnailUrl && allImageUrls.length === 0) {
        throw new Error('لطفاً حداقل یک عکس برای محصول انتخاب یا آدرس آن را وارد کنید.');
      }

      console.log('📸 Final processing result:');
      console.log('📸 Thumbnail:', thumbnailUrl);
      console.log('📸 Total images:', allImageUrls.length);
      console.log('📸 All image URLs:', allImageUrls);

      // ✨ آماده‌سازی داده‌ها - URL ها را بدون https://localhost:4000 ذخیره می‌کنیم
      const cleanImageUrls = allImageUrls.map(url => {
        if (typeof url === 'string') {
          return url.replace('https://localhost:4000', '');
        }
        return url;
      });

      const cleanThumbnail = thumbnailUrl ?
        (typeof thumbnailUrl === 'string' ? thumbnailUrl.replace('https://localhost:4000', '') : thumbnailUrl)
        : '';

      console.log('💾 Clean data preparation:');
      console.log('📸 Clean images count:', cleanImageUrls.length);
      console.log('📸 Clean images:', cleanImageUrls);
      console.log('🖼️ Clean thumbnail:', cleanThumbnail);

      const productData = {
        name: values.name,
        price: Number(values.price),
        stock: Number(values.stock),
        brand: values.brand,
        categories: Array.isArray(values.category) ? values.category : [],
        slug: values.slug || generateUniqueSlug(values.name),
        thumbnail: cleanThumbnail, // ✨ آخرین عکس به عنوان thumbnail
        images: cleanImageUrls, // ✨ آرایه کامل شامل همه عکس‌ها
        published: values.published !== false,
        description: values.description,
      };

      console.log('📤 Sending product data to backend:');
      console.log('📤 Clean images count:', cleanImageUrls.length);
      console.log('📤 Clean thumbnail:', cleanThumbnail);
      console.log('📤 Data prepared for page.tsx:', productData);
      console.log('🔍 IMAGES BEING SENT:', productData.images);
      console.log('🔍 THUMBNAIL BEING SENT:', productData.thumbnail);
      console.log('🔍 IMAGES COUNT:', productData.images?.length);

      // پاک کردن فایل‌های انتخاب شده بعد از موفقیت
      setFiles([]);
      setExistingImages([]);

      // ✨ اضافه کردن این دو خط:
      setIsSubmittingForm(false);
      setSubmitting(false);

      // فراخوانی callback
      setFiles([]);
      setExistingImages([]);

      // ✅ فقط داده‌ها را به page.tsx بفرست، خودت محصول را ذخیره نکن
      onSave({
        ...values,
        images: cleanImageUrls,
        thumbnail: cleanThumbnail,
        // اطلاعات اضافی برای صفحه
        uploadedImageUrls: cleanImageUrls,
        finalThumbnail: cleanThumbnail
      });
      return;

    } catch (error: any) {
      console.error('❌ Error in form submit:', error);
      setApiError(error.message);
    } finally {
      setSubmitting(false);
      setIsSubmittingForm(false);
    }
  };

  // ✨ مدیریت آپلود فایل‌های جدید (اضافه شدن، نه جایگزین شدن)
  const handleChangeDropZone = (newFiles: File[]) => {
    console.log('📁 Files selected:', newFiles.map(f => f.name));

    // اضافه کردن فایل‌های جدید به لیست موجود
    const updatedFiles = [...files];

    newFiles.forEach((file) => {
      // چک کنیم که فایل تکراری نباشد
      const isDuplicate = updatedFiles.some(existingFile =>
        existingFile.name === file.name && existingFile.size === file.size
      );

      if (!isDuplicate) {
        Object.assign(file, { preview: URL.createObjectURL(file) });
        updatedFiles.push(file);
      }
    });

    setFiles(updatedFiles);
    console.log('📁 Total files now:', updatedFiles.length);
  };

  // ✨ حذف فایل جدید انتخاب شده
  const handleFileDelete = (file: File) => () => {
    console.log('🗑️ Deleting new file:', file.name);
    setFiles((currentFiles) => currentFiles.filter((item) => item.name !== file.name));
  };

  // ✨ حذف عکس موجود
  const handleExistingImageDelete = (imageUrl: string) => () => {
    console.log('🗑️ Deleting existing image:', imageUrl);
    setExistingImages((currentImages) => currentImages.filter((url) => url !== imageUrl));
  };

  // ✨ تابع کمکی برای نمایش آدرس کامل عکس
  const getFullImageUrl = (imageUrl: string) => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http')) return imageUrl;
    if (imageUrl.startsWith('/uploads')) {
      return `http://localhost:4000${imageUrl}`;
    }
    return imageUrl;
  };

  return (
    <Card className="p-3">
      <Formik
        onSubmit={handleFormSubmit}
        initialValues={INITIAL_VALUES}
        validationSchema={VALIDATION_SCHEMA}
        enableReinitialize
      >
        {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
          <form onSubmit={handleSubmit}>
            {/* نمایش خطای API */}
            {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

            <Grid container spacing={3}>
              <Grid item sm={6} xs={12}>
                <TextField
                  fullWidth
                  name="name"
                  label="Name"
                  color="info"
                  size="medium"
                  placeholder="Name"
                  value={values.name}
                  onBlur={handleBlur}
                  onChange={handleChange}
                  helperText={touched.name && errors.name}
                  error={Boolean(touched.name && errors.name)}
                  disabled={isSubmitting || externalSubmitting}
                />
              </Grid>

              {/* ✨ فیلد کتگوری با داده‌های دینامیک از بک‌اند */}
              <Grid item sm={6} xs={12}>
                <TextField
                  select
                  fullWidth
                  color="info"
                  size="medium"
                  name="category"
                  onBlur={handleBlur}
                  placeholder="Category"
                  onChange={handleChange}
                  value={values.category}
                  label={categoriesLoading ? "Loading categories..." : "Select Category"}
                  SelectProps={{ multiple: true }}
                  error={Boolean(touched.category && errors.category)}
                  helperText={(touched.category && errors.category) as string}
                  disabled={isSubmitting || externalSubmitting || categoriesLoading}
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id || category.name} value={category.id || category.name}>
                      {category.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <DropZone
                  title="Drop & drag product images here (Multiple files allowed)"
                  onChange={handleChangeDropZone}
                />

                {/* ✨ نمایش عکس‌های موجود */}
                {existingImages.length > 0 && (
                  <Box mt={2}>
                    <Box mb={1} fontSize="0.875rem" color="text.secondary">
                      عکس‌های موجود:
                    </Box>
                    <FlexBox flexDirection="row" flexWrap="wrap" gap={1}>
                      {existingImages.map((imageUrl, index) => (
                        <UploadImageBox key={`existing-${index}`}>
                          <Box
                            component="img"
                            src={getFullImageUrl(imageUrl)}
                            width="100%"
                            alt="existing"
                          />
                          <StyledClear onClick={handleExistingImageDelete(imageUrl)} />
                        </UploadImageBox>
                      ))}
                    </FlexBox>
                  </Box>
                )}

                {/* ✨ نمایش فایل‌های جدید انتخاب شده */}
                {files.length > 0 && (
                  <Box mt={2}>
                    <Box mb={1} fontSize="0.875rem" color="text.secondary">
                      فایل‌های جدید انتخاب شده:
                    </Box>
                    <FlexBox flexDirection="row" flexWrap="wrap" gap={1}>
                      {files.map((file, index) => (
                        <UploadImageBox key={`new-${index}`}>
                          <Box component="img" src={file.preview} width="100%" alt="preview" />
                          <StyledClear onClick={handleFileDelete(file)} />
                        </UploadImageBox>
                      ))}
                    </FlexBox>
                  </Box>
                )}
              </Grid>

              <Grid item xs={12}>
                <TextField
                  rows={6}
                  multiline
                  fullWidth
                  color="info"
                  size="medium"
                  name="description"
                  label="Description"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="Description"
                  value={values.description}
                  helperText={touched.description && errors.description}
                  error={Boolean(touched.description && errors.description)}
                  disabled={isSubmitting || externalSubmitting}
                />
              </Grid>

              <Grid item sm={6} xs={12}>
                <TextField
                  fullWidth
                  name="stock"
                  color="info"
                  size="medium"
                  label="Stock"
                  placeholder="Stock"
                  onBlur={handleBlur}
                  value={values.stock}
                  onChange={handleChange}
                  helperText={touched.stock && errors.stock}
                  error={Boolean(touched.stock && errors.stock)}
                  disabled={isSubmitting || externalSubmitting}
                />
              </Grid>

              <Grid item sm={6} xs={12}>
                <TextField
                  fullWidth
                  name="price"
                  color="info"
                  size="medium"
                  label="Price"
                  placeholder="Price"
                  onBlur={handleBlur}
                  value={values.price}
                  onChange={handleChange}
                  helperText={touched.price && errors.price}
                  error={Boolean(touched.price && errors.price)}
                  disabled={isSubmitting || externalSubmitting}
                />
              </Grid>

              <Grid item sm={6} xs={12}>
                <TextField
                  fullWidth
                  name="brand"
                  label="Brand"
                  color="info"
                  size="medium"
                  placeholder="Brand"
                  onBlur={handleBlur}
                  value={values.brand}
                  onChange={handleChange}
                  helperText={touched.brand && errors.brand}
                  error={Boolean(touched.brand && errors.brand)}
                  disabled={isSubmitting || externalSubmitting}
                />
              </Grid>

              <Grid item sm={6} xs={12}>
                <TextField
                  fullWidth
                  name="sale_price"
                  color="info"
                  size="medium"
                  label="Sale Price"
                  placeholder="Sale Price"
                  onBlur={handleBlur}
                  value={values.sale_price}
                  onChange={handleChange}
                  helperText={touched.sale_price && errors.sale_price}
                  error={Boolean(touched.sale_price && errors.sale_price)}
                  disabled={isSubmitting || externalSubmitting}
                />
              </Grid>

              <Grid item xs={12}>
                <FlexBox gap={2}>
                  <Button
                    variant="contained"
                    color="info"
                    type="submit"
                    disabled={isSubmitting || externalSubmitting}
                  >
                    {isSubmitting || externalSubmitting ? 'Saving...' : 'Save product'}
                  </Button>

                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={onCancel}
                    disabled={isSubmitting || externalSubmitting}
                  >
                    Cancel
                  </Button>
                </FlexBox>
              </Grid>
            </Grid>
          </form>
        )}
      </Formik>
    </Card>
  );
}