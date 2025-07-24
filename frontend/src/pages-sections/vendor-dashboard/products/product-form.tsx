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
// GLOBAL CUSTOM COMPONENTS
import DropZone from "components/DropZone";
import { FlexBox } from "components/flex-box";
// STYLED COMPONENTS
import { UploadImageBox, StyledClear } from "../styles";
import { Alert } from "@mui/material";

// FORM FIELDS VALIDATION SCHEMA
const VALIDATION_SCHEMA = yup.object().shape({
  name: yup.string().required("Name is required!"),
  category: yup.string().optional(), // 🔥 تغییر: از array به string
  description: yup.string().optional(),
  stock: yup.number().required("Stock is required!"),
  price: yup.number().required("Price is required!"),
  sale_price: yup.number().optional(),
  brand: yup.string().optional(),
});

// ================================================================
interface Props {
  productToEdit?: any;
  onSave: (product: any) => void | Promise<void>; // 🔥 تغییر: قبول Promise هم
  onCancel?: () => void; // 🔥 تغییر: اختیاری
}
// ================================================================

export default function ProductForm({ productToEdit, onSave, onCancel }: Props) {
  const [apiError, setApiError] = useState("");

  const INITIAL_VALUES = {
    name: productToEdit?.name || "",
    brand: productToEdit?.brand || "",
    stock: productToEdit?.stock || "",
    price: productToEdit?.price || "",
    category: productToEdit?.categories || "", // 🔥 تغییر: string نه array
    sale_price: productToEdit?.sale_price || "",
    description: productToEdit?.description || "",
    thumbnail: productToEdit?.thumbnail || "",
    slug: productToEdit?.slug || "",
    published: productToEdit?.published ?? true,
  };

  // 🔥 تابع ساده‌تر برای compatibility
  const handleFormSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      setApiError("");
      setSubmitting(true);

      // ✅ فراخوانی مستقیم onSave با values
      await onSave(values);

    } catch (error: any) {
      setApiError(error.message || "خطا در ذخیره محصول");
    } finally {
      setSubmitting(false);
    }
  };

  const [files, setFiles] = useState([]);

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
                  label="نام محصول"
                  color="info"
                  size="medium"
                  placeholder="نام محصول"
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
                  placeholder="دسته‌بندی"
                  onChange={handleChange}
                  value={values.category}
                  label="دسته‌بندی"
                  error={Boolean(touched.category && errors.category)}
                  helperText={(touched.category && errors.category) as string}
                  disabled={isSubmitting}
                >
                  <MenuItem value="">انتخاب کنید</MenuItem>
                  <MenuItem value="electronics">الکترونیک</MenuItem>
                  <MenuItem value="fashion">مد و پوشاک</MenuItem>
                  <MenuItem value="books">کتاب</MenuItem>
                  <MenuItem value="home">خانه و آشپزخانه</MenuItem>
                  <MenuItem value="sports">ورزش</MenuItem>
                </TextField>
              </Grid>

              <Grid item sm={6} xs={12}>
                <TextField
                  fullWidth
                  name="brand"
                  label="برند"
                  color="info"
                  size="medium"
                  placeholder="برند محصول"
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
                  name="thumbnail"
                  label="آدرس تصویر"
                  color="info"
                  size="medium"
                  placeholder="https://example.com/image.jpg"
                  value={values.thumbnail}
                  onBlur={handleBlur}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </Grid>

              {/* بخش آپلود تصویر - اختیاری */}
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
                  rows={4}
                  multiline
                  fullWidth
                  color="info"
                  size="medium"
                  name="description"
                  label="توضیحات"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="توضیحات محصول..."
                  value={values.description}
                  helperText={touched.description && errors.description}
                  error={Boolean(touched.description && errors.description)}
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
                  label="قیمت (تومان)"
                  onChange={handleChange}
                  placeholder="0"
                  helperText={touched.price && errors.price}
                  error={Boolean(touched.price && errors.price)}
                  disabled={isSubmitting}
                />
              </Grid>

              <Grid item sm={6} xs={12}>
                <TextField
                  fullWidth
                  name="stock"
                  color="info"
                  size="medium"
                  type="number"
                  label="موجودی"
                  placeholder="0"
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
                  color="info"
                  size="medium"
                  type="number"
                  name="sale_price"
                  label="قیمت با تخفیف (اختیاری)"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="0"
                  value={values.sale_price}
                  helperText={touched.sale_price && errors.sale_price}
                  error={Boolean(touched.sale_price && errors.sale_price)}
                  disabled={isSubmitting}
                />
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" gap={2}>
                  <Button
                    variant="contained"
                    color="info"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "در حال ذخیره..." : "ذخیره محصول"}
                  </Button>

                  {onCancel && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={onCancel}
                      disabled={isSubmitting}
                    >
                      انصراف
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
          </form>
        )}
      </Formik>
    </Card>
  );
}