"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Typography,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  Tooltip
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  DragIndicator,
  Link as LinkIcon
} from '@mui/icons-material';
import CarouselForm from './CarouselForm';

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
  id: number;
  title: string;
  subtitle?: string;
  description?: string;
  media_id: number;
  link_url?: string;
  link_text?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  media?: MediaFile;
}

// ========================= CAROUSEL MANAGEMENT COMPONENT =========================
export default function CarouselManagement() {
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CarouselItem | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CarouselItem | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // دریافت لیست اسلایدها
  const fetchCarouselItems = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/carousel');
      const data = await response.json();

      if (response.ok) {
        setCarouselItems(data);
      } else {
        setError(data.message || 'خطا در دریافت اسلایدها');
      }
    } catch (err) {
      setError('خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  // ایجاد اسلاید جدید
  const handleCreateSlide = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  // ویرایش اسلاید
  const handleEditSlide = (item: CarouselItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  // ذخیره اسلاید (ایجاد یا ویرایش)
  const handleSaveSlide = (savedItem: CarouselItem) => {
    if (editingItem) {
      // ویرایش: به‌روزرسانی آیتم در لیست
      setCarouselItems(prev =>
        prev.map(item => item.id === savedItem.id ? savedItem : item)
      );
      setSuccess('اسلاید با موفقیت ویرایش شد');
    } else {
      // ایجاد: افزودن آیتم جدید به لیست
      setCarouselItems(prev => [...prev, savedItem]);
      setSuccess('اسلاید جدید با موفقیت ایجاد شد');
    }

    setFormOpen(false);
    setEditingItem(null);
  };

  // تغییر وضعیت فعال/غیرفعال
  const handleToggleActive = async (item: CarouselItem) => {
    try {
      const response = await fetch(`/api/carousel/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item,
          is_active: !item.is_active
        }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setCarouselItems(prev =>
          prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i)
        );
        setSuccess(`اسلاید ${updatedItem.is_active ? 'فعال' : 'غیرفعال'} شد`);
      } else {
        setError('خطا در تغییر وضعیت اسلاید');
      }
    } catch (err) {
      setError('خطا در ارتباط با سرور');
    }
  };

  // تأیید حذف
  const handleDeleteConfirm = (item: CarouselItem) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  // حذف اسلاید
  const handleDeleteSlide = async () => {
    if (!itemToDelete) return;

    try {
      const response = await fetch(`/api/carousel/${itemToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCarouselItems(prev => prev.filter(item => item.id !== itemToDelete.id));
        setSuccess('اسلاید با موفقیت حذف شد');
      } else {
        setError('خطا در حذف اسلاید');
      }
    } catch (err) {
      setError('خطا در ارتباط با سرور');
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  // بارگذاری داده‌ها در شروع
  useEffect(() => {
    fetchCarouselItems();
  }, []);

  // پاک کردن پیام‌ها بعد از 5 ثانیه
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <Box>
      {/* هدر صفحه */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          مدیریت اسلایدر صفحه اصلی
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={handleCreateSlide}
        >
          افزودن اسلاید جدید
        </Button>
      </Box>

      {/* پیام‌های وضعیت */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* محتوای اصلی */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : carouselItems.length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign="center" p={4}>
              <Typography variant="h6" color="text.secondary" mb={2}>
                هیچ اسلایدی وجود ندارد
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                برای شروع، اولین اسلاید خود را ایجاد کنید
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={handleCreateSlide}
              >
                ایجاد اسلاید
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* نمایش کارتی */}
          <Grid container spacing={3} mb={4}>
            {carouselItems
              .sort((a, b) => a.display_order - b.display_order)
              .map((item) => (
                <Grid item xs={12} md={6} lg={4} key={item.id}>
                  <Card sx={{ position: 'relative' }}>
                    {/* نشانگر وضعیت */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        zIndex: 1
                      }}
                    >
                      <Chip
                        size="small"
                        label={item.is_active ? 'فعال' : 'غیرفعال'}
                        color={item.is_active ? 'success' : 'default'}
                      />
                    </Box>

                    {/* ترتیب نمایش */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 1,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        borderRadius: 1,
                        px: 1,
                        py: 0.5
                      }}
                    >
                      <Typography variant="caption">
                        #{item.display_order}
                      </Typography>
                    </Box>

                    {/* تصویر */}
                    {item.media?.file_url && (
                      <CardMedia
                        component="img"
                        height="200"
                        image={item.media.file_url}
                        alt={item.media.alt_text || item.title}
                        sx={{ objectFit: 'cover' }}
                      />
                    )}

                    <CardContent>
                      {/* عنوان */}
                      <Typography variant="h6" component="h3" mb={1} noWrap>
                        {item.title}
                      </Typography>

                      {/* زیرعنوان */}
                      {item.subtitle && (
                        <Typography variant="body2" color="text.secondary" mb={1} noWrap>
                          {item.subtitle}
                        </Typography>
                      )}

                      {/* توضیحات */}
                      {item.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          mb={2}
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {item.description}
                        </Typography>
                      )}

                      {/* لینک */}
                      {item.link_url && (
                        <Box display="flex" alignItems="center" mb={2}>
                          <LinkIcon fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary" ml={1} noWrap>
                            {item.link_text || 'مشاهده بیشتر'}
                          </Typography>
                        </Box>
                      )}

                      {/* دکمه‌های عملیات */}
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Tooltip title="ویرایش">
                            <IconButton size="small" onClick={() => handleEditSlide(item)}>
                              <Edit />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title={item.is_active ? 'غیرفعال کردن' : 'فعال کردن'}>
                            <IconButton size="small" onClick={() => handleToggleActive(item)}>
                              {item.is_active ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="حذف">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteConfirm(item)}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Box>

                        <Typography variant="caption" color="text.secondary">
                          {new Date(item.created_at).toLocaleDateString('fa-IR')}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
          </Grid>

          {/* نمایش جدولی */}
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>
                لیست کامل اسلایدها
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ترتیب</TableCell>
                      <TableCell>تصویر</TableCell>
                      <TableCell>عنوان</TableCell>
                      <TableCell>زیرعنوان</TableCell>
                      <TableCell>وضعیت</TableCell>
                      <TableCell>تاریخ ایجاد</TableCell>
                      <TableCell>عملیات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {carouselItems
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.display_order}</TableCell>
                          <TableCell>
                            {item.media?.file_url && (
                              <Box
                                component="img"
                                src={item.media.file_url}
                                alt={item.title}
                                sx={{
                                  width: 60,
                                  height: 40,
                                  objectFit: 'cover',
                                  borderRadius: 1
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell>{item.title}</TableCell>
                          <TableCell>{item.subtitle || '-'}</TableCell>
                          <TableCell>
                            <Switch
                              checked={item.is_active}
                              onChange={() => handleToggleActive(item)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(item.created_at).toLocaleDateString('fa-IR')}
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => handleEditSlide(item)}>
                              <Edit />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteConfirm(item)}
                            >
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* مودال فرم */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <CarouselForm
            carouselItem={editingItem}
            onSave={handleSaveSlide}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* مودال تأیید حذف */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>تأیید حذف</DialogTitle>
        <DialogContent>
          <Typography>
            آیا مطمئن هستید که می‌خواهید اسلاید "{itemToDelete?.title}" را حذف کنید؟
          </Typography>
          <Typography variant="body2" color="error" mt={1}>
            این عمل قابل بازگشت نیست.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            انصراف
          </Button>
          <Button onClick={handleDeleteSlide} color="error" variant="contained">
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}