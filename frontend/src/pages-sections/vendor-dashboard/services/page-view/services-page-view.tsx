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
  DragHandle as DragIcon
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { H1 } from "components/Typography";

interface Service {
  id: number;
  icon: string;
  title: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

const availableIcons = [
  "Truck", "Gift", "Payment", "Shield", "RefreshCw", "Clock",
  "Heart", "Star", "CheckCircle", "Award", "Phone", "Mail"
];

export default function ServicesPageView() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [formData, setFormData] = useState({
    icon: "",
    title: "",
    description: "",
    isActive: true,
    sortOrder: 0
  });

  const { enqueueSnackbar } = useSnackbar();

  // دریافت لیست سرویس‌ها
  const fetchServices = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:4000/api/admin/services");
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      } else {
        throw new Error("خطا در دریافت سرویس‌ها");
      }
    } catch (error) {
      enqueueSnackbar("خطا در دریافت سرویس‌ها", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // باز کردن دیالوگ برای اضافه/ویرایش
  const handleOpenDialog = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        icon: service.icon,
        title: service.title,
        description: service.description,
        isActive: service.is_active,
        sortOrder: service.sort_order
      });
    } else {
      setEditingService(null);
      setFormData({
        icon: "",
        title: "",
        description: "",
        isActive: true,
        sortOrder: services.length
      });
    }
    setDialogOpen(true);
  };

  // ذخیره سرویس
  const handleSaveService = async () => {
    try {
      const url = editingService
        ? `http://localhost:4000/api/admin/services/${editingService.id}`
        : "http://localhost:4000/api/admin/services";

      const method = editingService ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        enqueueSnackbar(
          editingService ? "سرویس بروزرسانی شد" : "سرویس جدید اضافه شد",
          { variant: "success" }
        );
        setDialogOpen(false);
        fetchServices();
      } else {
        throw new Error("خطا در ذخیره سرویس");
      }
    } catch (error) {
      enqueueSnackbar("خطا در ذخیره سرویس", { variant: "error" });
    }
  };

  // حذف سرویس
  const handleDeleteService = async (id: number) => {
    if (!confirm("آیا مطمئن هستید که می‌خواهید این سرویس را حذف کنید؟")) return;

    try {
      const response = await fetch(`http://localhost:4000/api/admin/services/${id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        enqueueSnackbar("سرویس حذف شد", { variant: "success" });
        fetchServices();
      } else {
        throw new Error("خطا در حذف سرویس");
      }
    } catch (error) {
      enqueueSnackbar("خطا در حذف سرویس", { variant: "error" });
    }
  };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <H1>مدیریت سرویس‌های فروشگاه</H1>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          اضافه کردن سرویس جدید
        </Button>
      </Stack>

      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 3 }}>
        سرویس‌های زیر در صفحه اصلی فروشگاه نمایش داده می‌شوند. مثل "ارسال رایگان"، "پشتیبانی ۲۴ ساعته" و...
      </Alert>

      {/* Services List */}
      <Grid container spacing={2}>
        {services.map((service) => (
          <Grid item xs={12} key={service.id}>
            <Card sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                {/* Drag Handle */}
                <IconButton>
                  <DragIcon />
                </IconButton>

                {/* Icon Preview */}
                <Avatar
                  variant="rounded"
                  sx={{ width: 60, height: 60, bgcolor: "primary.light" }}
                >
                  <Typography variant="caption">{service.icon}</Typography>
                </Avatar>

                {/* Content */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">{service.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {service.description}
                  </Typography>
                  <Typography variant="caption" display="block">
                    آیکون: {service.icon}
                  </Typography>
                </Box>

                {/* Status */}
                <Chip
                  label={service.is_active ? "فعال" : "غیرفعال"}
                  color={service.is_active ? "success" : "default"}
                  size="small"
                />

                {/* Order */}
                <Typography variant="caption" sx={{ minWidth: 60 }}>
                  ترتیب: {service.sort_order}
                </Typography>

                {/* Actions */}
                <Stack direction="row" spacing={1}>
                  <IconButton
                    color="primary"
                    onClick={() => handleOpenDialog(service)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteService(service.id)}
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
          {editingService ? "ویرایش سرویس" : "اضافه کردن سرویس جدید"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>آیکون</InputLabel>
                <Select
                  value={formData.icon}
                  label="آیکون"
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  required
                >
                  {availableIcons.map((icon) => (
                    <MenuItem key={icon} value={icon}>
                      {icon}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="ترتیب نمایش"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="عنوان سرویس"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="توضیحات"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>لغو</Button>
          <Button variant="contained" onClick={handleSaveService}>
            {editingService ? "بروزرسانی" : "اضافه کردن"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}