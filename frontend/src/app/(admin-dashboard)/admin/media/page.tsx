"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  LinearProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  CloudUpload,
  Folder,
  Assessment,
  TrendingUp,
  Storage,
  Image,
  VideoLibrary,
  PictureAsPdf,
  InsertDriveFile,
  Refresh,
  Settings,
  DeleteSweep,
  Category
} from '@mui/icons-material';
import FileManager from 'components/FileManager';
import DropZone from 'components/DropZone';

// ========================= TYPES =========================
interface MediaStats {
  total_files: number;
  total_size: number;
  images: number;
  videos: number;
  documents: number;
  other: number;
  used_files: number;
  unused_files: number;
  storage_usage: {
    used: number;
    total: number;
    percentage: number;
  };
}

interface ActivityLog {
  id: number;
  action: string;
  file_name: string;
  user_name: string;
  created_at: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

// ========================= MEDIA LIBRARY PAGE =========================
export default function MediaLibraryPage() {
  const [currentTab, setCurrentTab] = useState(0);
  const [stats, setStats] = useState<MediaStats | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // دریافت آمار
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/media/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // دریافت لاگ فعالیت‌ها
  const fetchActivityLog = async () => {
    try {
      const response = await fetch('/api/media/activity');
      if (response.ok) {
        const data = await response.json();
        setActivityLog(data);
      }
    } catch (error) {
      console.error('Error fetching activity log:', error);
    }
  };

  // آپلود فایل‌ها
  const handleFileUpload = async (files: File[]) => {
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`${files.length} فایل با موفقیت آپلود شد`);
        await fetchStats();
        await fetchActivityLog();
        setUploadDialogOpen(false);
      } else {
        setError(data.message || 'خطا در آپلود فایل‌ها');
      }
    } catch (error) {
      setError('خطا در ارتباط با سرور');
    } finally {
      setUploading(false);
    }
  };

  // پاک‌سازی فایل‌های غیرمستعمل
  const cleanupUnusedFiles = async () => {
    if (!confirm('آیا مطمئن هستید که می‌خواهید فایل‌های غیرمستعمل را حذف کنید؟')) {
      return;
    }

    try {
      const response = await fetch('/api/media/cleanup', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`${data.deleted_count} فایل غیرمستعمل حذف شد`);
        await fetchStats();
      } else {
        setError('خطا در پاک‌سازی فایل‌ها');
      }
    } catch (error) {
      setError('خطا در ارتباط با سرور');
    }
  };

  // فرمت سایز فایل
  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // آیکون بر اساس نوع فایل
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'images': return <Image color="primary" />;
      case 'videos': return <VideoLibrary color="secondary" />;
      case 'documents': return <PictureAsPdf color="error" />;
      default: return <InsertDriveFile color="action" />;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchActivityLog()]);
      setLoading(false);
    };

    loadData();
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <div>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography>در حال بارگذاری...</Typography>
        </div>
      </Box>
    );
  }

  return (
    <Box>
      {/* هدر */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          کتابخانه رسانه
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              fetchStats();
              fetchActivityLog();
            }}
          >
            بروزرسانی
          </Button>
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            onClick={() => setUploadDialogOpen(true)}
          >
            آپلود فایل
          </Button>
        </Box>
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

      {/* آمار کلی */}
      {stats && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Storage color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">{stats.total_files}</Typography>
                </Box>
                <Typography color="text.secondary">کل فایل‌ها</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <TrendingUp color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6">{formatFileSize(stats.total_size)}</Typography>
                </Box>
                <Typography color="text.secondary">کل حجم</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Assessment color="info" sx={{ mr: 1 }} />
                  <Typography variant="h6">{stats.used_files}</Typography>
                </Box>
                <Typography color="text.secondary">فایل‌های استفاده شده</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <DeleteSweep color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6">{stats.unused_files}</Typography>
                </Box>
                <Typography color="text.secondary">فایل‌های غیرمستعمل</Typography>
                {stats.unused_files > 0 && (
                  <Button
                    size="small"
                    color="warning"
                    onClick={cleanupUnusedFiles}
                    sx={{ mt: 1 }}
                  >
                    پاک‌سازی
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* توزیع نوع فایل‌ها */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>توزیع فایل‌ها بر اساس نوع</Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>{getTypeIcon('images')}</ListItemIcon>
                    <ListItemText primary="تصاویر" secondary={`${stats.images} فایل`} />
                    <Chip label={`${((stats.images / stats.total_files) * 100).toFixed(1)}%`} size="small" />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemIcon>{getTypeIcon('videos')}</ListItemIcon>
                    <ListItemText primary="ویدیوها" secondary={`${stats.videos} فایل`} />
                    <Chip label={`${((stats.videos / stats.total_files) * 100).toFixed(1)}%`} size="small" />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemIcon>{getTypeIcon('documents')}</ListItemIcon>
                    <ListItemText primary="اسناد" secondary={`${stats.documents} فایل`} />
                    <Chip label={`${((stats.documents / stats.total_files) * 100).toFixed(1)}%`} size="small" />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemIcon>{getTypeIcon('other')}</ListItemIcon>
                    <ListItemText primary="سایر" secondary={`${stats.other} فایل`} />
                    <Chip label={`${((stats.other / stats.total_files) * 100).toFixed(1)}%`} size="small" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* استفاده از فضای ذخیره‌سازی */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>فضای ذخیره‌سازی</Typography>
                <Box mb={2}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">استفاده شده</Typography>
                    <Typography variant="body2">
                      {formatFileSize(stats.storage_usage.used)} / {formatFileSize(stats.storage_usage.total)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={stats.storage_usage.percentage}
                    sx={{ height: 8, borderRadius: 4 }}
                    color={stats.storage_usage.percentage > 90 ? 'error' :
                           stats.storage_usage.percentage > 70 ? 'warning' : 'primary'}
                  />
                  <Typography variant="caption" display="block" textAlign="center" mt={1}>
                    {stats.storage_usage.percentage.toFixed(1)}% استفاده شده
                  </Typography>
                </Box>
                {stats.storage_usage.percentage > 90 && (
                  <Alert severity="warning" size="small">
                    فضای ذخیره‌سازی تقریباً پر است
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* تب‌ها */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
            <Tab label="مرور فایل‌ها" />
            <Tab label="آپلود گروهی" />
            <Tab label="فعالیت‌های اخیر" />
            <Tab label="تنظیمات" />
          </Tabs>
        </Box>

        {/* تب مرور فایل‌ها */}
        <TabPanel value={currentTab} index={0}>
          <Box p={3}>
            <FileManager
              showUpload={false}
              showDetails={true}
              selectionMode="none"
            />
          </Box>
        </TabPanel>

        {/* تب آپلود گروهی */}
        <TabPanel value={currentTab} index={1}>
          <Box p={3}>
            <Typography variant="h6" mb={2}>آپلود گروهی فایل‌ها</Typography>
            <DropZone
              title="فایل‌های خود را اینجا بکشید یا کلیک کنید"
              imageSize="حداکثر 10 فایل، هر کدام حداکثر 10 مگابایت"
              onChange={handleFileUpload}
            />
            {uploading && (
              <Box mt={2}>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary" mt={1}>
                  در حال آپلود فایل‌ها...
                </Typography>
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* تب فعالیت‌های اخیر */}
        <TabPanel value={currentTab} index={2}>
          <Box p={3}>
            <Typography variant="h6" mb={2}>فعالیت‌های اخیر</Typography>
            {activityLog.length === 0 ? (
              <Typography color="text.secondary">هیچ فعالیتی ثبت نشده</Typography>
            ) : (
              <List>
                {activityLog.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem>
                      <ListItemText
                        primary={`${activity.action} - ${activity.file_name}`}
                        secondary={`توسط ${activity.user_name} در ${new Date(activity.created_at).toLocaleDateString('fa-IR')}`}
                      />
                    </ListItem>
                    {index < activityLog.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        </TabPanel>

        {/* تب تنظیمات */}
        <TabPanel value={currentTab} index={3}>
          <Box p={3}>
            <Typography variant="h6" mb={2}>تنظیمات کتابخانه رسانه</Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" mb={2}>تنظیمات آپلود</Typography>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    حداکثر سایز فایل: 10 مگابایت
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    فرمت‌های مجاز: JPG, PNG, GIF, WebP, MP4, WebM, PDF
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    حداکثر تعداد فایل در هر آپلود: 10
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" mb={2}>تنظیمات بهینه‌سازی</Typography>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    فشرده‌سازی خودکار تصاویر: فعال
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    تولید thumbnail: فعال
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    کیفیت فشرده‌سازی: 85%
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" mb={2}>عملیات نگهداری</Typography>
                  <Box display="flex" gap={2}>
                    <Button
                      variant="outlined"
                      onClick={cleanupUnusedFiles}
                      startIcon={<DeleteSweep />}
                    >
                      پاک‌سازی فایل‌های غیرمستعمل
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        // پیاده‌سازی بازسازی thumbnail ها
                      }}
                      startIcon={<Refresh />}
                    >
                      بازسازی Thumbnail ها
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Card>

      {/* دیالوگ آپلود */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>آپلود فایل</DialogTitle>
        <DialogContent>
          <DropZone
            title="فایل‌های خود را اینجا بکشید"
            imageSize="حداکثر 10 فایل، هر کدام حداکثر 10 مگابایت"
            onChange={handleFileUpload}
          />
          {uploading && (
            <Box mt={2}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" mt={1}>
                در حال آپلود...
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}