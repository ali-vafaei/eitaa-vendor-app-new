"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Card,
  Grid,
  Button,
  MenuItem,
  TextField,
  Typography,
  Alert,
  FormControlLabel,
  Switch,
  Divider,
  Chip,
  Stack
} from "@mui/material";
import { Formik } from "formik";
import * as yup from "yup";
import MediaSelector from "components/MediaSelector";
import { FlexBox } from "components/flex-box";

// ========================= TYPES =========================
interface ProductFormProps {
  productToEdit?: any;
  onSave: (product: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// ========================= VALIDATION SCHEMA =========================
const VALIDATION_SCHEMA = yup.object().shape({
  name: yup.string().required("نام محصول الزامی است"),
  price: yup.number().required("قیمت الزامی است").min(0, "قیمت نمی‌تواند منفی باشد"),
  stock: yup.number().required("موجودی الزامی است").min(0, "موجودی نمی‌تواند منفی باشد"),
  category: yup.array().min(1, "حداقل یک دسته‌بندی انتخاب کنید"),
  brand: yup.string(),
  sale_price: yup.number().min(0, "قیمت فروش نمی‌تواند منفی باشد"),
  description: yup.string()
});

// ========================= PRODUCT FORM COMPONENT =========================
export default function ProductForm({
  productToEdit,
  onSave,
  onCancel,
  isSubmitting: externalSubmitting
}: ProductFormProps) {
  const [apiError, setApiError] = useState("");
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // State برای مدیریت تصاویر
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [thumbnailImage, setThumbnailImage] = useState<string>("");

  const isEditing = !!productToEdit;

  // مقادیر اولیه فرم
  const INITIAL_VALUES = {
    name: productToEdit?.name || "",
    brand: productToEdit?.brand || "",
    stock: productToEdit?.stock || 0,
    price: productToEdit?.price || 0,
    category: productToEdit?.categories || [],
    sale_price: productToEdit?.sale_price || 0,
    description: productToEdit?.description || "",
    published: productToEdit?.published ?? true,
    slug: productToEdit?.slug || ""
  };

  // دریافت لیست دسته‌بندی‌ها
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await fetch('http://localhost:4000/api/categories');

        if (response.ok) {
          const data = await response.json();
          setCategories(data || []);
        } else {
          throw new Error('خطا در دریافت دسته‌بندی‌ها');
        }
      } catch (error) {
        console.error('خطا در دریافت دسته‌بندی‌ها:', error);
        // دسته‌بندی‌های پیش‌فرض
        setCategories([
          { id: 'electronics', name: 'الکترونیک' },
          { id: 'fashion', name: 'مد و پوشاک' },
          { id: 'beauty', name: 'زیبایی و بهداشت' },
          { id: 'sports', name: 'ورزش' },
          { id: 'books', name: 'کتاب' }
        ]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // بارگذاری تصاویر موجود
  useEffect(() => {
    if (productToEdit) {
      // تنظیم تصاویر موجود
      if (productToEdit.images && Array.isArray(productToEdit.images)) {
        const validImages = productToEdit.images.filter(img => img && img.trim() !== '');
        setSelectedImages(validImages);
      }

      // تنظیم تصویر اصلی
      if (productToEdit.thumbnail) {
        setThumbnailImage(productToEdit.thumbnail);
      }
    }
  }, [productToEdit]);

  // تولید slug منحصر به فرد
  const generateUniqueSlug = (name: string): string => {
    if (!name || name.trim() === '') {
      return `product-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    }

    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^\u0600-\u06FFa-z0-9\s-]/g, '') // حفظ فارسی و انگلیسی
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const timestamp = Date.now();
    const randomNum = Math.random().toString(36).substr(2, 5);
    return `${baseSlug || 'product'}-${timestamp}-${randomNum}`;
  };

  // مدیریت submit فرم
  const handleFormSubmit = async (values: any, { setSubmitting }: any) => {
    if (isSubmittingForm) {
      console.log('فرم در حال ارسال است...');
      return;
    }

    setIsSubmittingForm(true);
    setApiError("");
    setSubmitting(true);

    try {
      // بررسی وجود حداقل یک تصویر
      if (selectedImages.length === 0 && !thumbnailImage) {
        throw new Error('لطفاً حداقل یک تصویر برای محصول انتخاب کنید');
      }

      // تعیین تصویر اصلی
      let finalThumbnail = thumbnailImage;
      if (!finalThumbnail && selectedImages.length > 0) {
        finalThumbnail = selectedImages[0];
      }

      // تمیز کردن URL ها (حذف localhost)
      const cleanImages = selectedImages.map(url =>
        url.replace('http://localhost:4000', '')
      );
      const cleanThumbnail = finalThumbnail ?
        finalThumbnail.replace('http://localhost:4000', '') : '';

      // آماده‌سازی داده‌های محصول
      const productData = {
        name: values.name,
        price: Number(values.price),
        stock: Number(values.stock),
        brand: values.brand,
        categories: Array.isArray(values.category) ? values.category : [],
        slug: values.slug || generateUniqueSlug(values.name),
        thumbnail: cleanThumbnail,
        images: cleanImages,
        published: values.published,
        description: values.description,
        sale_price: values.sale_price ? Number(values.sale_price) : null
      };

      console.log('ارسال داده‌های محصول:', productData);

      // ارسال به parent component
      onSave({
        ...values,
        images: cleanImages,
        thumbnail: cleanThumbnail,
        uploadedImageUrls: cleanImages,
        finalThumbnail: cleanThumbnail
      });

    } catch (error: any) {
      console.error('خطا در ارسال فرم:', error);
      setApiError(error.message);
    } finally {
      setSubmitting(false);
      setIsSubmittingForm(false);
    }
  };

  // مدیریت تغییر تصاویر گالری
  const handleImagesChange = (imageUrls: string | string[]) => {
    const urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls].filter(Boolean);
    setSelectedImages(urls);

    // اگر تصویر اصلی وجود ندارد، اولین تصویر را به عنوان اصلی انتخاب کن
    if (!thumbnailImage && urls.length > 0) {
      setThumbnailImage(urls[0]);
    }
  };

  // مدیریت تغییر تصویر اصلی
  const handleThumbnailChange = (imageUrl: string | string[]) => {
    const url = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;
    setThumbnailImage(url || "");
  };

  // تنظیم تصویر اصلی از بین تصاویر موجود
  const setPrimaryImage = (imageUrl: string) => {
    setThumbnailImage(imageUrl);
  };

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" mb={3}>
        {isEditing ? 'ویرایش محصول' : 'افزودن محصول جدید'}
      </Typography>

      <Formik
        onSubmit={handleFormSubmit}
        initialValues={INITIAL_VALUES}
        validationSchema={VALIDATION_SCHEMA}
        enableReinitialize
      >
        {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
          <form onSubmit={handleSubmit}>
            {/* نمایش خطای API */}
            {apiError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {apiError}
              </Alert>
            )}

            <Grid container spacing={3}>
              {/* نام محصول */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="name"
                  label="نام محصول"
                  placeholder="نام محصول را وارد کنید"
                  value={values.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={Boolean(touched.name && errors.name)}
                  helperText={touched.name && errors.name}
                  disabled={isSubmitting || externalSubmitting}
                  required
                />
              </Grid>

              {/* برند */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="brand"
                  label="برند"
                  placeholder="برند محصول"
                  value={values.brand}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={Boolean(touched.brand && errors.brand)}
                  helperText={touched.brand && errors.brand}
                  disabled={isSubmitting || externalSubmitting}
                />
              </Grid>

              {/* قیمت */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="price"
                  label="قیمت (تومان)"
                  type="number"
                  placeholder="0"
                  value={values.price}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={Boolean(touched.price && errors.price)}
                  helperText={touched.price && errors.price}
                  disabled={isSubmitting || externalSubmitting}
                  InputProps={{ inputProps: { min: 0 } }}
                  required
                />
              </Grid>

              {/* قیمت فروش */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="sale_price"
                  label="قیمت فروش (تومان)"
                  type="number"
                  placeholder="0"
                  value={values.sale_price}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={Boolean(touched.sale_price && errors.sale_price)}
                  helperText={touched.sale_price && errors.sale_price}
                  disabled={isSubmitting || externalSubmitting}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>

              {/* موجودی */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="stock"
                  label="موجودی"
                  type="number"
                  placeholder="0"
                  value={values.stock}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={Boolean(touched.stock && errors.stock)}
                  helperText={touched.stock && errors.stock}
                  disabled={isSubmitting || externalSubmitting}
                  InputProps={{ inputProps: { min: 0 } }}
                  required
                />
              </Grid>

              {/* دسته‌بندی */}
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  name="category"
                  label={categoriesLoading ? "در حال بارگذاری..." : "دسته‌بندی"}
                  value={values.category}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={Boolean(touched.category && errors.category)}
                  helperText={touched.category && errors.category}
                  disabled={isSubmitting || externalSubmitting || categoriesLoading}
                  SelectProps={{ multiple: true }}
                  required
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id || category.name} value={category.id || category.name}>
                      {category.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* توضیحات */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  name="description"
                  label="توضیحات محصول"
                  placeholder="توضیح کاملی از محصول ارائه دهید"
                  value={values.description}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={Boolean(touched.description && errors.description)}
                  helperText={touched.description && errors.description}
                  disabled={isSubmitting || externalSubmitting}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" mb={2}>تصاویر محصول</Typography>
              </Grid>

              {/* تصویر اصلی محصول */}
              <Grid item xs={12} md={6}>
                <MediaSelector
                  label="تصویر اصلی محصول"
                  value={thumbnailImage}
                  onChange={handleThumbnailChange}
                  multiple={false}
                  acceptedTypes={['image/*']}
                  required
                  disabled={isSubmitting || externalSubmitting}
                  helperText="این تصویر در لیست محصولات نمایش داده می‌شود"
                  error={!thumbnailImage && selectedImages.length === 0}
                  errorText="انتخاب تصویر اصلی الزامی است"
                />
              </Grid>

              {/* گالری تصاویر */}
              <Grid item xs={12} md={6}>
                <MediaSelector
                  label="گالری تصاویر محصول"
                  value={selectedImages}
                  onChange={handleImagesChange}
                  multiple={true}
                  maxFiles={10}
                  acceptedTypes={['image/*']}
                  disabled={isSubmitting || externalSubmitting}
                  helperText="حداکثر 10 تصویر اضافی برای نمایش در صفحه محصول"
                />
              </Grid>

              {/* نمایش تصاویر انتخاب شده */}
              {(selectedImages.length > 0 || thumbnailImage) && (
                <Grid item xs={12}>
                  <Box mt={2}>
                    <Typography variant="subtitle2" mb={2}>
                      تصاویر انتخاب شده:
                    </Typography>

                    {/* نمایش تصویر اصلی */}
                    {thumbnailImage && (
                      <Box mb={2}>
                        <Typography variant="caption" display="block" color="text.secondary" mb={1}>
                          تصویر اصلی:
                        </Typography>
                        <Box
                          component="img"
                          src={thumbnailImage.startsWith('http') ? thumbnailImage : `http://localhost:4000${thumbnailImage}`}
                          alt="تصویر اصلی"
                          sx={{
                            width: 120,
                            height: 120,
                            objectFit: 'cover',
                            border: '2px solid',
                            borderColor: 'primary.main',
                            borderRadius: 1,
                            mr: 1
                          }}
                        />
                      </Box>
                    )}

                    {/* نمایش گالری */}
                    {selectedImages.length > 0 && (
                      <Box>
                        <Typography variant="caption" display="block" color="text.secondary" mb={1}>
                          گالری تصاویر ({selectedImages.length} تصویر):
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {selectedImages.map((imageUrl, index) => (
                            <Box key={index} position="relative">
                              <Box
                                component="img"
                                src={imageUrl.startsWith('http') ? imageUrl : `http://localhost:4000${imageUrl}`}
                                alt={`تصویر ${index + 1}`}
                                sx={{
                                  width: 80,
                                  height: 80,
                                  objectFit: 'cover',
                                  border: '1px solid',
                                  borderColor: 'grey.300',
                                  borderRadius: 1,
                                  cursor: 'pointer'
                                }}
                                onClick={() => setPrimaryImage(imageUrl)}
                              />
                              {imageUrl === thumbnailImage && (
                                <Chip
                                  label="اصلی"
                                  size="small"
                                  color="primary"
                                  sx={{
                                    position: 'absolute',
                                    bottom: -8,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    fontSize: '10px'
                                  }}
                                />
                              )}
                            </Box>
                          ))}
                        </Stack>
                        <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                          برای تنظیم به عنوان تصویر اصلی، روی هر تصویر کلیک کنید
                        </Typography>
                      </Box>
                    )}

                    {/* خلاصه */}
                    <Box display="flex" gap={1} mt={2}>
                      {thumbnailImage && (
                        <Chip label="تصویر اصلی ✓" color="primary" size="small" />
                      )}
                      {selectedImages.length > 0 && (
                        <Chip
                          label={`${selectedImages.length} تصویر در گالری`}
                          color="secondary"
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>
                </Grid>
              )}

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>

              {/* وضعیت انتشار */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      name="published"
                      checked={values.published}
                      onChange={handleChange}
                      disabled={isSubmitting || externalSubmitting}
                    />
                  }
                  label="محصول منتشر شود"
                />
              </Grid>

              {/* دکمه‌های عملیات */}
              <Grid item xs={12}>
                <FlexBox gap={2} justifyContent="flex-end" mt={3}>
                  <Button
                    variant="outlined"
                    onClick={onCancel}
                    disabled={isSubmitting || externalSubmitting}
                  >
                    انصراف
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSubmitting || externalSubmitting}
                    sx={{ minWidth: 120 }}
                  >
                    {isSubmitting || externalSubmitting ?
                      'در حال ذخیره...' :
                      (isEditing ? 'ذخیره تغییرات' : 'ایجاد محصول')
                    }
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