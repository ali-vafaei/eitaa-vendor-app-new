// فایل: src/pages-sections/vendor-dashboard/products/product-form.tsx
// برگرداندن به حالت اصلی template:

"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { Formik } from "formik";
import * as yup from "yup";
import { Alert } from "@mui/material";
// GLOBAL CUSTOM COMPONENTS
import DropZone from "components/DropZone";
import { FlexBox } from "components/flex-box";
// STYLED COMPONENTS
import { UploadImageBox, StyledClear } from "../styles";

// FORM FIELDS VALIDATION SCHEMA (اصلی)
const VALIDATION_SCHEMA = yup.object().shape({
  name: yup.string().required("Name is required!"),
  category: yup.array(yup.string()).optional(), // ✅ array همان‌طور که در اصل بود
  description: yup.string().optional(),
  stock: yup.number().required("Stock is required!"),
  price: yup.number().required("Price is required!"),
  sale_price: yup.number().optional(),
  brand: yup.string().optional(),
});

interface Props {
  productToEdit?: any;
  onSave: (product: any) => void | Promise<void>;
  onCancel?: () => void;
}

export default function ProductForm({ productToEdit, onSave, onCancel }: Props) {
  const [apiError, setApiError] = useState("");

  const INITIAL_VALUES = {
    name: productToEdit?.name || "",
    brand: productToEdit?.brand || "",
    stock: productToEdit?.stock || "",
    price: productToEdit?.price || "",
    category: productToEdit?.categories || [], // ✅ array همان‌طور که در اصل بود
    sale_price: productToEdit?.sale_price || "",
    description: productToEdit?.description || "",
    thumbnail: productToEdit?.thumbnail || "",
    slug: productToEdit?.slug || "",
    published: productToEdit?.published ?? true,
  };

  const handleFormSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      setApiError("");
      setSubmetting(true);
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
                  SelectProps={{ multiple: true }} // ✅ multiple selection
                  error={Boolean(touched.category && errors.category)}
                  helperText={(touched.category && errors.category) as string}
                  disabled={isSubmitting}
                >
                  <MenuItem value="electronics">Electronics</MenuItem>
                  <MenuItem value="fashion">Fashion</MenuItem>
                  <MenuItem value="books">Books</MenuItem>
                  <MenuItem value="home">Home & Kitchen</MenuItem>
                  <MenuItem value="sports">Sports</MenuItem>
                </TextField>
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
                  disabled={isSubmitting}
                />
              </Grid>

              <Grid item sm={6} xs={12}>
                <TextField
                  fullWidth
                  name="thumbnail"
                  label="Image URL"
                  color="info"
                  size="medium"
                  placeholder="https://example.com/image.jpg"
                  value={values.thumbnail}
                  onBlur={handleBlur}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </Grid>

              <Grid item xs={12}>
                <DropZone onChange={(files) => handleChangeDropZone(files)} />
                <FlexBox flexDirection="row" mt={2} flexWrap="wrap" gap={1}>
                  {files.map((file, index) => (
                    <UploadImageBox key={index}>
                      <Box component="img" src={file.preview} width="100%" />
                      <StyledClear onClick={handleFileDelete(file)} />
                    </UploadImageBox>
                  ))}
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
                  name="stock"
                  color="info"
                  size="medium"
                  type="number"
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

              <Grid item xs={12}>
                <Box display="flex" gap={2}>
                  <Button
                    variant="contained"
                    color="info"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save product"}
                  </Button>

                  {onCancel && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={onCancel}
                      disabled={isSubmitting}
                    >
                      Cancel
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