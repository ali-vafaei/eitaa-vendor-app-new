"use client";

import { useState, useEffect } from "react"; // useEffect را اضافه می‌کنیم
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { Formik } from "formik";
import * as yup from "yup";
// GLOBAL CUSTOM COMPONENTS
import DropZone from "components/DropZone";
import { FlexBox } from "components/flex-box";
// STYLED COMPONENTS
import { UploadImageBox, StyledClear } from "../styles";
import { Alert } from "@mui/material"; // Alert را اضافه می‌کنیم

// FORM FIELDS VALIDATION SCHEMA
const VALIDATION_SCHEMA = yup.object().shape({
  name: yup.string().required("Name is required!"),
  // category را فعلاً اختیاری می‌کنیم تا بعداً پیاده‌سازی شود
  category: yup.array(yup.string()).optional(),
  description: yup.string().optional(), // توضیحات را اختیاری می‌کنیم
  stock: yup.number().required("Stock is required!"),
  price: yup.number().required("Price is required!"),
  sale_price: yup.number().optional(),
  // tags را به brand تغییر می‌دهیم تا با دیتابیس هماهنگ باشد
  brand: yup.string().optional(),
});

// ================================================================
// productToEdit را به عنوان ورودی اضافه می‌کنیم
interface Props {
  productToEdit?: any;
  onSave: (product: any) => void;
  onCancel: () => void;
}
// ================================================================

export default function ProductForm({ productToEdit, onSave, onCancel }: Props) {
  // ---> State جدید برای مدیریت خطای API <---
  const [apiError, setApiError] = useState("");

  const INITIAL_VALUES = {
    name: productToEdit?.name || "",
    brand: productToEdit?.brand || "",
    stock: productToEdit?.stock || "",
    price: productToEdit?.price || "",
    category: productToEdit?.categories || [],
    sale_price: productToEdit?.sale_price || "",
    description: productToEdit?.description || "",
    // فیلدهای اضافی که در فرم نیستند اما برای ارسال لازمند
    thumbnail: productToEdit?.thumbnail || "",
    slug: productToEdit?.slug || "",
    published: productToEdit?.published ?? true,
  };

  // ---> تابع handleFormSubmit به طور کامل تغییر کرد <---
  const handleFormSubmit = async (values: any, { setSubmitting }: any) => {
    setApiError("");
    const isEditing = !!productToEdit;

    // آماده‌سازی داده‌ها برای ارسال به بک‌اند
    const productData = {
      name: values.name,
      price: Number(values.price),
      stock: Number(values.stock),
      brand: values.brand,
      categories: values.category,
      // در آینده می‌توانیم slug را به صورت خودکار از نام محصول بسازیم
      slug: values.name.toLowerCase().replace(/\s+/g, '-'),
      // فعلا یک آدرس تصویر نمونه قرار می‌دهیم
      thumbnail: "https://via.placeholder.com/300.png?text=" + values.name,
      published: values.published,
    };

    const apiUrl = isEditing
      ? `http://localhost:4000/api/products/${productToEdit.id}`
      : 'http://localhost:4000/api/products';

    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(apiUrl, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'خطا در ذخیره محصول');
      }

      onSave(data); // محصول ذخیره شده را به صفحه والد برمی‌گردانیم

    } catch (error: any) {
      setApiError(error.message);
    } finally {
      setSubmitting(false);
    }
  };


  const [files, setFiles] = useState([]);

  // این توابع مربوط به آپلود تصویر فعلاً بدون تغییر باقی می‌مانند
  const handleChangeDropZone = (files: File[]) => {
    files.forEach((file) => Object.assign(file, { preview: URL.createObjectURL(file) }));
    setFiles(files);
  };

  const handleFileDelete = (file: File) => () => {
    setFiles((files) => files.filter((item) => item.name !== file.name));
  };

  return (
    <Card className="p-3">
      <Formik
        onSubmit={handleFormSubmit}
        initialValues={INITIAL_VALUES}
        validationSchema={VALIDATION_SCHEMA}
        enableReinitialize // این گزینه برای حالت ویرایش ضروری است
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
                  disabled={isSubmitting}
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
                  helperText={(touched.category && errors.category) as string}>
                  <MenuItem value="electronics">Electronics</MenuItem>
                  <MenuItem value="fashion">Fashion</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <DropZone onChange={(files) => handleChangeDropZone(files)} />
                <FlexBox flexDirection="row" mt={2} flexWrap="wrap" gap={1}>
                  {files.map((file, index) => {
                    return (
                      <UploadImageBox key={index}>
                        <Box component="img" src={file.preview} width="100%" />
                        <StyledClear onClick={handleFileDelete(file)} />
                      </UploadImageBox>
                    );
                  })}
                </FlexBox>
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                />
              </Grid>

              <Grid item sm={6} xs={12}>
                <TextField
                  fullWidth
                  name="brand" // ---> از tags به brand تغییر کرد
                  label="Brand"
                  color="info"
                  size="medium"
                  placeholder="Brand"
                  onBlur={handleBlur}
                  value={values.brand}
                  onChange={handleChange}
                  helperText={touched.brand && errors.brand}
                  error={Boolean(touched.brand && errors.brand)}
                  disabled={isSubmitting}
                />
              </Grid>

              <Grid item sm={6} xs={12}>
                <TextField
                  fullWidth
                  name="price"
                  color="info"
                  size="medium"
                  type="number"
                  onBlur={handleBlur}
                  value={values.price}
                  label="Regular Price"
                  onChange={handleChange}
                  placeholder="Regular Price"
                  helperText={touched.price && errors.price}
                  error={Boolean(touched.price && errors.price)}
                  disabled={isSubmitting}
                />
              </Grid>

              <Grid item sm={6} xs={12}>
                <TextField
                  fullWidth
                  color="info"
                  size="medium"
                  type="number"
                  name="sale_price"
                  label="Sale Price"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="Sale Price"
                  value={values.sale_price}
                  helperText={touched.sale_price && errors.sale_price}
                  error={Boolean(touched.sale_price && errors.sale_price)}
                  disabled={isSubmitting}
                />
              </Grid>

              <Grid item sm={6} xs={12}>
                <Button variant="contained" color="info" type="submit" disabled={isSubmitting}>
                  Save product
                </Button>
                <Button variant="outlined" color="secondary" onClick={onCancel} sx={{ ml: 2 }}>
                  Cancel
                </Button>
              </Grid>
            </Grid>
          </form>
        )}
      </Formik>
    </Card>
  );
}