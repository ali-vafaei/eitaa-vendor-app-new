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
  const [existingImages, setExistingImages] = useState<string[]>([]); // ✨ عکس‌های موجود
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

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

  // تابع اصلی ارسال فرم که فایل‌ها را هم مدیریت می‌کند
 // تابع اصلی ارسال فرم که فایل‌ها را هم مدیریت می‌کند
const handleFormSubmit = async (values: any, { setSubmitting }: any) => {
  // ✨ جلوگیری از double submit
  if (isSubmittingForm) {
    console.log('🛑 Form already submitting, ignoring...');
    return;
  }

  console.log('🚀 Form submit started...');
  console.log('📋 Form values:', values);
  console.log('📁 Files state:', files);
  console.log('📁 Files length:', files.length);
  console.log('📁 Files details:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));

  setIsSubmittingForm(true);
  setApiError("");
  setSubmitting(true);
  const isEditing = !!productToEdit;

  try {
    let imageUrl = values.thumbnail; // آدرس URL وارد شده توسط کاربر

    // مرحله ۱: اگر فایلی انتخاب شده، ابتدا آن را آپلود کن
    if (files && files.length > 0) {
      const fileToUpload = files[0];
      console.log('🚀 Uploading image file:', fileToUpload.name);
      console.log('📊 File details:', {
        name: fileToUpload.name,
        size: fileToUpload.size,
        type: fileToUpload.type,
        lastModified: fileToUpload.lastModified
      });

      const formData = new FormData();
      formData.append('image', fileToUpload);

      console.log('📤 FormData created, sending to backend...');

      const uploadResponse = await fetch('http://localhost:4000/api/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('📡 Upload response status:', uploadResponse.status);
      console.log('📡 Upload response ok:', uploadResponse.ok);

      const uploadResult = await uploadResponse.json();
      console.log('📡 Upload result:', uploadResult);

      if (!uploadResponse.ok) {
        throw new Error(uploadResult.error || 'خطا در آپلود عکس');
      }

      imageUrl = uploadResult.imageUrl; // آدرس عکس آپلود شده
      console.log('✅ Image uploaded successfully:', imageUrl);
    } else {
      console.log('⚠️ No files selected for upload');
    }

    // اگر هیچ عکسی (نه URL و نه فایل) وجود نداشت، خطا بده
    if (!imageUrl) {
      throw new Error('لطفاً یک عکس برای محصول انتخاب یا آدرس آن را وارد کنید.');
    }

    // مرحله ۲: آماده‌سازی داده‌ها برای ارسال به بک‌اند
    const productData = {
      name: values.name,
      price: Number(values.price),
      stock: Number(values.stock),
      brand: values.brand,
      categories: values.category,
      slug: values.slug || values.name.toLowerCase().replace(/\s+/g, '-'),
      thumbnail: imageUrl,
      images: [imageUrl], // گالری عکس
      published: values.published,
      description: values.description,
    };

    console.log('📤 Sending product data to backend:');
    console.log(JSON.stringify(productData, null, 2));

    const apiUrl = isEditing
      ? `http://localhost:4000/api/products/${productToEdit.id}`
      : 'http://localhost:4000/api/products';

    const method = isEditing ? 'PUT' : 'POST';

    const response = await fetch(apiUrl, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });

    console.log('📡 Product save response status:', response.status);
    console.log('📡 Product save response ok:', response.ok);

    const data = await response.json();
    console.log('📡 Product save result:', data);

    if (!response.ok) {
      throw new Error(data.message || 'خطا در ذخیره محصول');
    }

    console.log('✅ Product saved successfully:', data);

    // فراخوانی callback تعریف شده در page.tsx
    // فایل‌ها را به values اضافه می‌کنیم تا page.tsx بتواند آن‌ها را ببیند
    const valuesWithFiles = { ...values, files };
    console.log('📤 Calling onSave with:', valuesWithFiles);
    onSave(valuesWithFiles);

  } catch (error: any) {
    console.error('❌ Error in form submit:', error);
    setApiError(error.message);
  } finally {
    setSubmitting(false);
    setIsSubmittingForm(false); // ✨ اضافه شد
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
                  label="Select Category"
                  SelectProps={{ multiple: true }}
                  error={Boolean(touched.category && errors.category)}
                  helperText={(touched.category && errors.category) as string}
                  disabled={isSubmitting || externalSubmitting}>
                  <MenuItem value="electronics">Electronics</MenuItem>
                  <MenuItem value="fashion">Fashion</MenuItem>
                  <MenuItem value="beauty">Beauty</MenuItem>
                  <MenuItem value="sports">Sports</MenuItem>
                  <MenuItem value="books">Books</MenuItem>
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