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
  Alert,
  Select,
  MenuItem,
  InputLabel,
  FormControl
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

interface Banner {
  id: number;
  name: string;
  type: string;
  title: string;
  subtitle: string;
  description: string;
  button_text: string;
  button_link: string;
  image_url: string;
  is_active: boolean;
  display_order: number;
}

const bannerTypes = [
  { value: "offer_left", label: "بنر تخفیف چپ (Section3)" },
  { value: "offer_right", label: "بنر تخفیف راست (Section3)" },
  { value: "summer", label: "بنر تابستانی (Section8)" }
];

export default function BannersPageView() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    title: "",
    subtitle: "",
    description: "",
    buttonText: "",
    buttonLink: "",
    imageUrl: "",
    isActive: true,
    displayOrder: 0
  });

  const { enqueueSnackbar } = useSnackbar();

  // دریافت لیست بنرها
  const fetchBanners = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:4000/api/admin/banners");
      if (response.ok) {
        const data = await response.json();
        setBanners(data);
      } else {
        throw new Error("خطا در دریافت بنرها");
      }
    } catch (error) {
      enqueueSnackbar("خطا در دریافت بنرها", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // باز کردن دیالوگ برای اضافه/ویرایش
  const handleOpenDialog = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        name: banner.name,
        type: banner.type,
        title: banner.title,
        subtitle: banner.subtitle,
        description: banner.description,
        buttonText: banner.button_text,
        buttonLink: banner.button_link,
        imageUrl: banner.image_url,
        isActive: banner.is_active,
        displayOrder: banner.display_order
      });
    } else {
      setEditingBanner(null);
      setFormData({
        name: "",
        type: "",
        title: "",
        subtitle: "",
        description: "",
        buttonText: "",
        buttonLink: "",
        imageUrl: "",
        isActive: true,
        displayOrder: banners.length
      });
    }
    setDialogOpen(true);
  };

  // ذخیره بنر
  const handleSaveBanner = async () => {
    try {
      const url = editingBanner
        ? `http://localhost:4000/api/admin/banners/${editingBanner.id}`
        : "http://localhost:4000/api/admin/banners";

      const method = editingBanner ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        enqueueSnackbar(
          editingBanner ? "بنر بروزرسانی شد" : "بنر جدید اضافه شد",
          { variant: "success" }
        );
        setDialogOpen(false);
        fetchBanners();
      } else {
        throw new Error("خطا در ذخیره بنر");
      }
    } catch (error) {
      enqueueSnackbar("خطا در ذخیره بنر", { variant: "error" });
    }
  };

  // حذف بنر
  const handleDeleteBanner = async (id: number) => {
    if (!confirm("آیا مطمئن هستید که می‌خواهید این بنر را حذف کنید؟")) return;

    try {
      const response = await fetch(`http://localhost:4000/api/admin/banners/${id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        enqueueSnackbar("بنر حذف شد", { variant: "success" });
        fetchBanners();
      } else {
        throw new Error("خطا در حذف بنر");
      }
    } catch (error) {
      enqueueSnackbar("خطا در حذف بنر", { variant: "error" });
    }
  };

  // تبدیل نوع بنر به متن فارسی
  const getBannerTypeLabel = (type: string) => {
    const found = bannerTypes.find(t => t.value === type);
    return found ? found.label : type;
  };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <H1>مدیریت بنرهای فروشگاه</H1>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          اضافه کردن بنر جدید
        </Button>
      </Stack>

      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 3 }}>
        بنرها در بخش‌های مختلف صفحه اصلی نمایش داده می‌شوند:
        <br />• بنرهای تخفیف در وسط صفحه (Section3)
        <br />• بنر تابستانی در پایین صفحه (Section8)
      </Alert>

      {/* Banners List */}
      <Grid container spacing={2}>
        {banners.map((banner) => (
          <Grid item xs={12} key={banner.id}>
            <Card sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                {/* Drag Handle */}
                <IconButton>
                  <DragIcon />
                </IconButton>

                {/* Image Preview */}
                <Avatar
                  src={banner.image_url}
                  variant="rounded"
                  sx={{ width: 100, height: 60 }}
                >
                  <ImageIcon />
                </Avatar>

                {/* Content */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">{banner.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {getBannerTypeLabel(banner.type)}
                  </Typography>
                  <Typography variant="caption" display="block">
                    عنوان: {banner.title} | دکمه: {banner.button_text}
                  </Typography>
                </Box>

                {/* Status */}
                <Chip
                  label={banner.is_active ? "فعال" : "غیرفعال"}
                  color={banner.is_active ? "success" : "default"}
                  size="small"
                />

                {/* Order */}
                <Typography variant="caption" sx={{ minWidth: 60 }}>
                  ترتیب: {banner.display_order}
                </Typography>

                {/* Actions */}
                <Stack direction="row" spacing={1}>
                  <IconButton
                    color="primary"
                    onClick={() => handleOpenDialog(banner)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteBanner(banner.id)}
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
          {editingBanner ? "ویرایش بنر" : "اضافه کردن بنر جدید"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="نام بنر"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                helperText="برای شناسایی در لیست (مثل: تخفیف عید)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>نوع بنر</InputLabel>
                <Select
                  value={formData.type}
                  label="نوع بنر"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  {bannerTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="عنوان اصلی"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                helperText="مثل: Sale 50% Off یا 30% off for All Items"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="زیرعنوان"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                helperText="مثل: Holiday's Offer! یا Summer Offer!"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="توضیحات اضافی"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                helperText="مثل: Use Code : HOLI50 (اختیاری)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="متن دکمه"
                value={formData.buttonText}
                onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                helperText="مثل: Shop Now"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="لینک دکمه"
                value={formData.buttonLink}
                onChange={(e) => setFormData({ ...formData, buttonLink: e.target.value })}
                helperText="مثل: /sales-1"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="آدرس تصویر"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                required
                helperText="مثال: /assets/images/banners/banner1.jpg"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="ترتیب نمایش"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={6}>
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
            {formData.imageUrl && (
              <Grid item xs={12}>
                <Box sx={{ textAlign: "center", mt: 2 }}>
                  <img
                    src={formData.imageUrl}
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
          <Button variant="contained" onClick={handleSaveBanner}>
            {editingBanner ? "بروزرسانی" : "اضافه کردن"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}