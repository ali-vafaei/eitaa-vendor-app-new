"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Button,
  TextField,
  InputAdornment,
  Typography,
  Box,
  Chip,
  IconButton,
  Tabs,
  Tab,
  CircularProgress,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import {
  Search,
  CloudUpload,
  Delete,
  Edit,
  Check,
  Image,
  VideoLibrary,
  PictureAsPdf,
  InsertDriveFile
} from '@mui/icons-material';
import DropZone from 'components/DropZone';

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

interface MediaGalleryProps {
  open: boolean;
  onClose: () => void;
  onSelect: (file: MediaFile) => void;
  allowMultiple?: boolean;
  selectedFiles?: MediaFile[];
  acceptedTypes?: string[]; // ['image/*', 'video/*', 'application/pdf']
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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// ========================= MEDIA GALLERY COMPONENT =========================
export default function MediaGallery({
  open,
  onClose,
  onSelect,
  allowMultiple = false,
  selectedFiles = [],
  acceptedTypes = ['image/*']
}: MediaGalleryProps) {
  const [tabValue, setTabValue] = useState(0);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile[]>(selectedFiles);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');

  // دریافت لیست فایل‌ها
  const fetchMediaFiles = async (page = 1, search = '', mimeType = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
        mimeType
      });

      const response = await fetch(`/api/media?${params}`);
      const data = await response.json();

      if (response.ok) {
        setMediaFiles(data.data);
        setTotalPages(data.pagination.totalPages);
        setCurrentPage(data.pagination.page);
      } else {
        setError(data.message || 'خطا در دریافت فایل‌ها');
      }
    } catch (err) {
      setError('خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  // آپلود فایل‌های جدید
  const handleFileUpload = async (files: File[]) => {
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        // رفرش لیست فایل‌ها
        await fetchMediaFiles(currentPage, searchTerm, filterType);
        setTabValue(1); // تغییر به تب Library
      } else {
        setError(data.message || 'خطا در آپلود فایل');
      }
    } catch (err) {
      setError('خطا در آپلود فایل');
    } finally {
      setUploading(false);
    }
  };

  // انتخاب/لغو انتخاب فایل
  const toggleFileSelection = (file: MediaFile) => {
    if (allowMultiple) {
      const isSelected = selectedMedia.find(f => f.id === file.id);
      if (isSelected) {
        setSelectedMedia(prev => prev.filter(f => f.id !== file.id));
      } else {
        setSelectedMedia(prev => [...prev, file]);
      }
    } else {
      setSelectedMedia([file]);
    }
  };

  // تایید انتخاب
  const handleConfirmSelection = () => {
    if (allowMultiple) {
      selectedMedia.forEach(file => onSelect(file));
    } else if (selectedMedia.length > 0) {
      onSelect(selectedMedia[0]);
    }
    onClose();
  };

  // حذف فایل
  const handleDeleteFile = async (fileId: number) => {
    if (confirm('آیا مطمئن هستید که می‌خواهید این فایل را حذف کنید؟')) {
      try {
        const response = await fetch(`/api/media/${fileId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          await fetchMediaFiles(currentPage, searchTerm, filterType);
        } else {
          setError('خطا در حذف فایل');
        }
      } catch (err) {
        setError('خطا در حذف فایل');
      }
    }
  };

  // دریافت آیکون بر اساس نوع فایل
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image />;
    if (mimeType.startsWith('video/')) return <VideoLibrary />;
    if (mimeType === 'application/pdf') return <PictureAsPdf />;
    return <InsertDriveFile />;
  };

  // فرمت سایز فایل
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Effect for initial load and search/filter changes
  useEffect(() => {
    if (open) {
      fetchMediaFiles(1, searchTerm, filterType);
    }
  }, [open, searchTerm, filterType]);

  // Effect for pagination
  useEffect(() => {
    if (open && currentPage > 1) {
      fetchMediaFiles(currentPage, searchTerm, filterType);
    }
  }, [currentPage]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: '80vh' } }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">مدیریت رسانه</Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedMedia.length > 0 && `${selectedMedia.length} فایل انتخاب شده`}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="آپلود فایل" />
          <Tab label="کتابخانه رسانه" />
        </Tabs>

        {/* تب آپلود */}
        <TabPanel value={tabValue} index={0}>
          <DropZone
            title="فایل‌های خود را اینجا بکشید و رها کنید"
            imageSize="حداکثر 10 مگابایت"
            onChange={handleFileUpload}
          />
          {uploading && (
            <Box display="flex" justifyContent="center" mt={2}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>در حال آپلود...</Typography>
            </Box>
          )}
        </TabPanel>

        {/* تب کتابخانه */}
        <TabPanel value={tabValue} index={1}>
          {/* جستجو و فیلتر */}
          <Box mb={3} display="flex" gap={2}>
            <TextField
              fullWidth
              placeholder="جستجو در فایل‌ها..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>نوع فایل</InputLabel>
              <Select
                value={filterType}
                label="نوع فایل"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="">همه</MenuItem>
                <MenuItem value="image">تصاویر</MenuItem>
                <MenuItem value="video">ویدیوها</MenuItem>
                <MenuItem value="application">اسناد</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* لیست فایل‌ها */}
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Grid container spacing={2}>
                {mediaFiles.map((file) => {
                  const isSelected = selectedMedia.find(f => f.id === file.id);

                  return (
                    <Grid item xs={6} sm={4} md={3} lg={2} key={file.id}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          border: isSelected ? '2px solid #1976d2' : '1px solid #e0e0e0',
                          position: 'relative'
                        }}
                        onClick={() => toggleFileSelection(file)}
                      >
                        {isSelected && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              zIndex: 1,
                              backgroundColor: '#1976d2',
                              borderRadius: '50%',
                              color: 'white',
                              width: 24,
                              height: 24,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Check fontSize="small" />
                          </Box>
                        )}

                        {file.mime_type.startsWith('image/') ? (
                          <CardMedia
                            component="img"
                            height="120"
                            image={file.file_url}
                            alt={file.alt_text || file.original_name}
                            sx={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <Box
                            sx={{
                              height: 120,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#f5f5f5'
                            }}
                          >
                            {getFileIcon(file.mime_type)}
                          </Box>
                        )}

                        <CardContent sx={{ p: 1 }}>
                          <Typography variant="caption" display="block" noWrap>
                            {file.original_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(file.file_size)}
                          </Typography>

                          <Box display="flex" justifyContent="space-between" mt={1}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                // اینجا می‌توانید مودال ویرایش اطلاعات فایل را باز کنید
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFile(file.id);
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>

              {/* صفحه‌بندی */}
              {totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={(e, page) => setCurrentPage(page)}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>انصراف</Button>
        <Button
          onClick={handleConfirmSelection}
          variant="contained"
          disabled={selectedMedia.length === 0}
        >
          انتخاب ({selectedMedia.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
}