"use client";

import React, { useState } from 'react';
import {
  Card,
  Grid,
  Button,
  TextField,
  Typography,
  Alert,
  Switch,
  FormControlLabel,
  Box
} from '@mui/material';
import { Formik } from 'formik';
import * as yup from 'yup';
import MediaSelector from 'components/MediaSelector';

// ========================= TYPES =========================
interface MediaFile {
  id: number;
  filename: string;
  original_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  alt_text?: string;
  title?: string;
  caption?: string;
  width?: number;
  height?: number;
  created_at: string;
}

interface CarouselItem {
  id?: number;
  title: string;
  subtitle?: string;
  description?: string;
  media_id?: number;
  link_url?: string;
  link_text?: string;
  display_order: number;
  is_active: boolean;
  media?: MediaFile;
}

interface CarouselFormProps {
  carouselItem?: CarouselItem;
  onSave: (item: CarouselItem) => void;
  onCancel: () => void;
}

// ========================= VALIDATION SCHEMA =========================
const VALIDATION_SCHEMA = yup.object().shape({
  title: yup.string().required('عنوان الزامی است'),
  subtitle: yup.string(),
  description: yup.string(),
  link_url: yup.string().url('لینک معتبر وارد کنید'),
  link_text: yup.string(),
  display_order: yup.number().min(0, 'ترتیب نمایش نمی‌تواند منفی باشد').required('ترتیب نمایش الزامی است'),
  is_active: yup.boolean()
});

// ========================= CAROUSEL FORM COMPONENT =========================
export default function CarouselForm({ carouselItem, onSave, onCancel }: CarouselFormProps) {
  const [selectedMedia, setSelectedMedia] = useState<MediaFile[]>(
    carouselItem?.media ? [carouselItem.media] : []
  );
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(carouselItem?.id);

  const INITIAL_VALUES: CarouselItem = {
    title: carouselItem?.title || '',
    subtitle: carouselItem?.subtitle || '',
    description: carouselItem?.description || '',
    link_url: carouselItem?.link_url || '',
    link_text: carouselItem?.link_text || '',
    display_order: carouselItem?.display_order || 0,
    is_active: carouselItem?.is_active ?? true,
    media_id: carouselItem?.media_id
  };

  const handleFormSubmit = async (values: CarouselItem) => {
    setIsSubmitting(true);
    setApiError('');

    try {
      // بررسی اینکه آیا تصویری انتخاب شده یا نه
      if (selectedMedia.length === 0) {
        setApiError('لطفاً یک تصویر برای اسلاید انتخاب کنید');
        setIsSubmitting(false);
        return;
      }

      const carouselData = {
        ...values,
        media_id: selectedMedia[0].id
      };

      const apiUrl = isEditing
        ? `http://localhost:4000/api/carousel/${carouselItem.id}`
        : 'http://localhost:4000/api/carousel';

      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(apiUrl, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(carouselData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'خطا در ذخیره اسلاید');
      }

      // اضافه کردن اطلاعات رسانه به داده برگشتی
      const resultWithMedia = {
        ...data,
        media: selectedMedia[0]
      };

      onSave(resultWithMedia);

    } catch (error: any) {
      setApiError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-3">
      <Typography variant="h6" mb={3}>
        {isEditing ? 'ویرایش اسلاید' : 'افزودن اسلاید جدید'}
      </Typography>

      <Formik
        onSubmit={handleFormSubmit}
        initialValues={INITIAL_VALUES}
        validationSchema={VALIDATION_SCHEMA}
        enableReinitialize
      >
        {({ values, errors, touched, handleChange, handleBlur, handleSubmit }) => (
          <form onSubmit={handleSubmit}>
            {/* نمایش خطای API */}
            {apiError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {apiError}
              </Alert>
            )}

            <Grid container spacing={3}>
              {/* عنوان اصلی */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="title"
                  label="عنوان اصلی"
                  color="info"
                  size="medium"
                  placeholder="عنوان اسلاید را وارد کنید"
                  value={values.title}
                  onBlur={handleBlur}
                  onChange={handleChange}
                  helperText={touched.title && errors.title}
                  error={Boolean(touched.title && errors.title)}
                  required
                />
              </Grid>

              {/* زیرعنوان */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="subtitle"
                  label="زیرعنوان"
                  color="info"
                  size="medium"
                  placeholder="زیرعنوان (اختیاری)"
                  value={values.subtitle}
                  onBlur={handleBlur}
                  onChange={handleChange}
                  helperText={touched.subtitle && errors.subtitle}
                  error={Boolean(touched.subtitle && errors.subtitle)}
                />
              </Grid>

              {/* توضیحات */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  name="description"
                  label="توضیحات"
                  color="info"
                  placeholder="توضیح کوتاهی در مورد اسلاید"
                  value={values.description}
                  onBlur={handleBlur}
                  onChange={handleChange}
                  helperText={touched.description && errors.description}
                  error={Boolean(touched.description && errors.description)}
                />
              </Grid>

              {/* انتخاب تصویر */}
              <Grid item xs={12}>
                <MediaSelector
                  label="تصویر اسلاید"
                  selectedFiles={selectedMedia}
                  onFilesChange={setSelectedMedia}
                  allowMultiple={false}
                  acceptedTypes={['image/*']}
                  helperText="تصویری با ابعاد 1920×800 پیکسل و فرمت JPG، PNG یا WebP انتخاب کنید"
                  required
                  error={selectedMedia.length === 0 && Boolean(apiError)}
                  errorText={selectedMedia.length === 0 ? "انتخاب تصویر الزامی است" : ""}
                />
              </Grid>

              {/* لینک */}
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  name="link_url"
                  label="لینک اسلاید"
                  color="info"
                  size="medium"
                  placeholder="https://example.com"
                  value={values.link_url}
                  onBlur={handleBlur}
                  onChange={handleChange}
                  helperText={touched.link_url && errors.link_url}
                  error={Boolean(touched.link_url && errors.link_url)}
                />
              </Grid>

              {/* متن لینک */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  name="link_text"
                  label="متن دکمه"
                  color="info"
                  size="medium"
                  placeholder="مشاهده بیشتر"
                  value={values.link_text}
                  onBlur={handleBlur}
                  onChange={handleChange}
                  helperText={touched.link_text && errors.link_text}
                  error={Boolean(touched.link_text && errors.link_text)}
                />
              </Grid>

              {/* ترتیب نمایش */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  name="display_order"
                  label="ترتیب نمایش"
                  color="info"
                  size="medium"
                  placeholder="0"
                  value={values.display_order}
                  onBlur={handleBlur}
                  onChange={handleChange}
                  helperText={touched.display_order && errors.display_order || "عدد کمتر = اولویت بالاتر"}
                  error={Boolean(touched.display_order && errors.display_order)}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>

              {/* وضعیت فعال/غیرفعال */}
              <Grid item xs={12} md={6}>
                <Box display="flex" alignItems="center" height="100%">
                  <FormControlLabel
                    control={
                      <Switch
                        name="is_active"
                        checked={values.is_active}
                        onChange={handleChange}
                        color="info"
                      />
                    }
                    label="اسلاید فعال است"
                  />
                </Box>
              </Grid>

              {/* دکمه‌های عملیات */}
              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={onCancel}
                    disabled={isSubmitting}
                  >
                    انصراف
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="info"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'در حال ذخیره...' : (isEditing ? 'ذخیره تغییرات' : 'ایجاد اسلاید')}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        )}
      </Formik>
    </Card>
  );
}