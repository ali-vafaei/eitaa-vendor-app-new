"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Card,
  Button,
  IconButton,
  Typography,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
  Avatar,
  Alert
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragHandle as DragIcon,
  Image as ImageIcon
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { H1 } from "components/Typography";

interface CarouselSlide {
  id: number;
  title: string;
  subTitle: string;
  buttonText: string;
  buttonLink: string;
  imgUrl: string;
  isActive: boolean;
  sortOrder: number;
}

export default function CarouselPageView() {
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<Partial<CarouselSlide> | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    subTitle: "",
    buttonText: "",
    buttonLink: "",
    imgUrl: "",
    isActive: true,
    sortOrder: 0
  });

  const { enqueueSnackbar } = useSnackbar();

  // دریافت لیست اسلایدها
  const fetchSlides = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:4000/api/gift-shop/main-carousel");
      if (response.ok) {
        const data = await response.json();
        setSlides(data);
      } else {
        throw new Error("خطا در دریافت اسلایدها");
      }
    } catch (error) {
      enqueueSnackbar("خطا در دریافت اسلایدها", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  // باز کردن دیالوگ برای اضافه/ویرایش
  const handleOpenDialog = (slide?: CarouselSlide) => {
    if (slide) {
      setEditingSlide(slide);
      setFormData({
        title: slide.title,
        subTitle: slide.subTitle,
        buttonText: slide.buttonText,
        buttonLink: slide.buttonLink,
        imgUrl: slide.imgUrl,
        isActive: slide.isActive,
        sortOrder: slide.sortOrder
      });
    } else {
      setEditingSlide(null);
      setFormData({
        title: "",
        subTitle: "",
        buttonText: "",
        buttonLink: "",
        imgUrl: "",
        isActive: true,
        sortOrder: slides.length
      });
    }
    setDialogOpen(true);
  };

  // ذخیره اسلاید
  const handleSaveSlide = async () => {
    try {
      const url = editingSlide
        ? `http://localhost:4000/api/admin/carousel/${editingSlide.id}`
        : "http://localhost:4000/api/admin/carousel";

      const method = editingSlide ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        enqueueSnackbar(
          editingSlide ? "اسلاید بروزرسانی شد" : "اسلاید جدید اضافه شد",
          { variant: "success" }
        );
        setDialogOpen(false);
        fetchSlides();
      } else {
        throw new Error("خطا در ذخیره اسلاید");
      }
    } catch (error) {
      enqueueSnackbar("خطا در ذخیره اسلاید", { variant: "error" });
    }
  };

  // حذف اسلاید
  const handleDeleteSlide = async (id: number) => {
    if (!confirm("آیا مطمئن هستید که می‌خواهید این اسلاید را حذف کنید؟")) return;

    try {
      const response = await fetch(`http://localhost:4000/api/admin/carousel/${id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        enqueueSnackbar("اسلاید حذف شد", { variant: "success" });
        fetchSlides();
      } else {
        throw new Error("خطا در حذف اسلاید");
      }
    } catch (error) {
      enqueueSnackbar("خطا در حذف اسلاید", { variant: "error" });
    }
  };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <H1>مدیریت Carousel صفحه اصلی</H1>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          اضافه کردن اسلاید جدید
        </Button>
      </Stack>

      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 3 }}>
        اسلایدهای زیر در صفحه اصلی فروشگاه نمایش داده می‌شوند. می‌توانید ترتیب، محتوا و وضعیت آن‌ها را مدیریت کنید.
      </Alert>

      {/* Slides List */}
      <Grid container spacing={2}>
        {slides.map((slide) => (
          <Grid item xs={12} key={slide.id}>
            <Card sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                {/* Drag Handle */}
                <IconButton>
                  <DragIcon />
                </IconButton>

                {/* Image Preview */}
                <Avatar
                  src={slide.imgUrl}
                  variant="rounded"
                  sx={{ width: 80, height: 60 }}
                >
                  <ImageIcon />
                </Avatar>

                {/* Content */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">{slide.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {slide.subTitle}
                  </Typography>
                  <Typography variant="caption" display="block">
                    دکمه: {slide.buttonText} | لینک: {slide.buttonLink}
                  </Typography>
                </Box>

                {/* Status */}
                <Chip
                  label={slide.isActive ? "فعال" : "غیرفعال"}
                  color={slide.isActive ? "success" : "default"}
                  size="small"
                />

                {/* Order */}
                <Typography variant="caption" sx={{ minWidth: 60 }}>
                  ترتیب: {slide.sortOrder}
                </Typography>

                {/* Actions */}
                <Stack direction="row" spacing={1}>
                  <IconButton
                    color="primary"
                    onClick={() => handleOpenDialog(slide)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteSlide(slide.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              </Stack>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSlide ? "ویرایش اسلاید" : "اضافه کردن اسلاید جدید"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="عنوان اصلی"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="زیرعنوان"
                value={formData.subTitle}
                onChange={(e) => setFormData({ ...formData, subTitle: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="متن دکمه"
                value={formData.buttonText}
                onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="لینک دکمه"
                value={formData.buttonLink}
                onChange={(e) => setFormData({ ...formData, buttonLink: e.target.value })}
              />
            </Grid>
            <Grid item xs={8}>
              <TextField
                fullWidth
                label="آدرس تصویر"
                value={formData.imgUrl}
                onChange={(e) => setFormData({ ...formData, imgUrl: e.target.value })}
                required
                helperText="مثال: /assets/images/carousel/slide1.jpg"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="ترتیب نمایش"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="فعال"
              />
            </Grid>
            {formData.imgUrl && (
              <Grid item xs={12}>
                <Box sx={{ textAlign: "center", mt: 2 }}>
                  <img
                    src={formData.imgUrl}
                    alt="Preview"
                    style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8 }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>لغو</Button>
          <Button variant="contained" onClick={handleSaveSlide}>
            {editingSlide ? "بروزرسانی" : "اضافه کردن"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}