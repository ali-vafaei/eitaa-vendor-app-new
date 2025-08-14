"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Menu,
  MenuList,
  MenuItem as MenuItemComp,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Pagination,
  Breadcrumbs,
  Link,
  Tooltip,
  Zoom,
  Fade,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondary,
  Divider,
  LinearProgress,
  Badge
} from '@mui/material';
import {
  Search,
  FilterList,
  ViewModule,
  ViewList,
  CloudUpload,
  Edit,
  Delete,
  Info,
  Download,
  Share,
  MoreVert,
  Folder,
  Image,
  VideoLibrary,
  PictureAsPdf,
  InsertDriveFile,
  Close,
  NavigateNext,
  GridView,
  Sort,
  Refresh,
  CheckCircle,
  Cancel
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

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
  thumbnails?: Record<string, string>;
  created_at: string;
  usage?: {
    carousel: number;
    products: number;
    categories: number;
    banners: number;
    total: number;
  };
}

interface FileManagerProps {
  onSelect?: (files: MediaFile[]) => void;
  selectionMode?: 'single' | 'multiple' | 'none';
  acceptedTypes?: string[];
  showUpload?: boolean;
  showDetails?: boolean;
  maxSelection?: number;
}

interface FileInfoDialogProps {
  file: MediaFile | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (file: MediaFile) => void;
  onDelete: (fileId: number) => void;
}

// ========================= FILE INFO DIALOG =========================
function FileInfoDialog({ file, open, onClose, onUpdate, onDelete }: FileInfoDialogProps) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    alt_text: '',
    caption: ''
  });
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<MediaFile['usage']>(null);

  useEffect(() => {
    if (file) {
      setFormData({
        title: file.title || '',
        alt_text: file.alt_text || '',
        caption: file.caption || ''
      });
      fetchUsageInfo(file.id);
    }
  }, [file]);

  const fetchUsageInfo = async (fileId: number) => {
    try {
      const response = await fetch(`/api/media/${fileId}/usage`);
      if (response.ok) {
        const usageData = await response.json();
        setUsage(usageData);
      }
    } catch (error) {
      console.error('Error fetching usage info:', error);
    }
  };

  const handleSave = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/media/${file.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedFile = await response.json();
        onUpdate({ ...file, ...formData });
        setEditing(false);
      }
    } catch (error) {
      console.error('Error updating file:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!file || !confirm('آیا مطمئن هستید؟')) return;

    try {
      const response = await fetch(`/api/media/${file.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onDelete(file.id);
        onClose();
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!file) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">جزئیات فایل</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* پیش‌نمایش فایل */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                {file.mime_type.startsWith('image/') ? (
                  <Box
                    component="img"
                    src={file.file_url}
                    alt={file.alt_text || file.original_name}
                    sx={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: 300,
                      objectFit: 'contain',
                      borderRadius: 1
                    }}
                  />
                ) : (
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    minHeight={200}
                    bgcolor="grey.100"
                    borderRadius={1}
                  >
                    {file.mime_type.startsWith('video/') && <VideoLibrary sx={{ fontSize: 80 }} />}
                    {file.mime_type === 'application/pdf' && <PictureAsPdf sx={{ fontSize: 80 }} />}
                    {!file.mime_type.startsWith('image/') &&
                     !file.mime_type.startsWith('video/') &&
                     file.mime_type !== 'application/pdf' && <InsertDriveFile sx={{ fontSize: 80 }} />}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* اطلاعات فایل */}
          <Grid item xs={12} md={6}>
            <Box>
              {/* اطلاعات پایه */}
              <Typography variant="h6" mb={2}>اطلاعات فایل</Typography>

              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">نام فایل:</Typography>
                <Typography variant="body1">{file.original_name}</Typography>
              </Box>

              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">سایز:</Typography>
                <Typography variant="body1">{formatFileSize(file.file_size)}</Typography>
              </Box>

              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">نوع فایل:</Typography>
                <Typography variant="body1">{file.mime_type}</Typography>
              </Box>

              {file.width && file.height && (
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">ابعاد:</Typography>
                  <Typography variant="body1">{file.width} × {file.height} پیکسل</Typography>
                </Box>
              )}

              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">تاریخ آپلود:</Typography>
                <Typography variant="body1">
                  {new Date(file.created_at).toLocaleDateString('fa-IR')}
                </Typography>
              </Box>

              {/* آمار استفاده */}
              {usage && (
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary" mb={1}>آمار استفاده:</Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {usage.carousel > 0 && <Chip label={`اسلایدر: ${usage.carousel}`} size="small" />}
                    {usage.products > 0 && <Chip label={`محصولات: ${usage.products}`} size="small" />}
                    {usage.categories > 0 && <Chip label={`دسته‌بندی: ${usage.categories}`} size="small" />}
                    {usage.banners > 0 && <Chip label={`بنر: ${usage.banners}`} size="small" />}
                    {usage.total === 0 && <Chip label="استفاده نشده" size="small" color="default" />}
                  </Box>
                </Box>
              )}

              {/* فرم ویرایش */}
              <Divider sx={{ my: 2 }} />

              {editing ? (
                <Box>
                  <TextField
                    fullWidth
                    label="عنوان"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    margin="normal"
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="متن جایگزین (Alt Text)"
                    value={formData.alt_text}
                    onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
                    margin="normal"
                    size="small"
                    helperText="برای بهبود دسترسی‌پذیری"
                  />
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="توضیحات"
                    value={formData.caption}
                    onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                    margin="normal"
                    size="small"
                  />
                </Box>
              ) : (
                <Box>
                  <Box mb={1}>
                    <Typography variant="body2" color="text.secondary">عنوان:</Typography>
                    <Typography variant="body1">{file.title || '-'}</Typography>
                  </Box>
                  <Box mb={1}>
                    <Typography variant="body2" color="text.secondary">متن جایگزین:</Typography>
                    <Typography variant="body1">{file.alt_text || '-'}</Typography>
                  </Box>
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">توضیحات:</Typography>
                    <Typography variant="body1">{file.caption || '-'}</Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button
          color="error"
          onClick={handleDelete}
          disabled={usage?.total > 0}
          startIcon={<Delete />}
        >
          حذف
        </Button>
        <Button startIcon={<Download />} href={file.file_url} download>
          دانلود
        </Button>
        {editing ? (
          <>
            <Button onClick={() => setEditing(false)}>انصراف</Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <CheckCircle />}
            >
              ذخیره
            </Button>
          </>
        ) : (
          <Button
            variant="contained"
            onClick={() => setEditing(true)}
            startIcon={<Edit />}
          >
            ویرایش
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ========================= MAIN FILE MANAGER COMPONENT =========================
export default function FileManager({
  onSelect,
  selectionMode = 'none',
  acceptedTypes = [],
  showUpload = true,
  showDetails = true,
  maxSelection = 10
}: FileManagerProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [infoDialogFile, setInfoDialogFile] = useState<MediaFile | null>(null);
  const [contextMenu, setContextMenu] = useState<{anchorEl: HTMLElement, file: MediaFile} | null>(null);

  // دریافت فایل‌ها
  const fetchFiles = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search: searchTerm,
        mimeType: filterType,
        sortBy,
        sortOrder
      });

      const response = await fetch(`/api/media?${params}`);
      const data = await response.json();

      if (response.ok) {
        setFiles(data.data);
        setTotalPages(data.pagination.totalPages);
        setCurrentPage(data.pagination.page);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  // آپلود فایل
  const handleFileUpload = async (uploadedFiles: File[]) => {
    setUploading(true);
    try {
      const formData = new FormData();
      uploadedFiles.forEach(file => formData.append('files', file));

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        await fetchFiles(currentPage);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
    }
  };

  // انتخاب فایل
  const toggleFileSelection = (file: MediaFile) => {
    if (selectionMode === 'none') return;

    if (selectionMode === 'single') {
      setSelectedFiles([file]);
      onSelect?.([file]);
    } else {
      const isSelected = selectedFiles.find(f => f.id === file.id);
      let newSelection: MediaFile[];

      if (isSelected) {
        newSelection = selectedFiles.filter(f => f.id !== file.id);
      } else if (selectedFiles.length < maxSelection) {
        newSelection = [...selectedFiles, file];
      } else {
        return; // حداکثر انتخاب رسیده
      }

      setSelectedFiles(newSelection);
      onSelect?.(newSelection);
    }
  };

  // منوی راست کلیک
  const handleContextMenu = (event: React.MouseEvent, file: MediaFile) => {
    event.preventDefault();
    setContextMenu({ anchorEl: event.currentTarget as HTMLElement, file });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // فرمت سایز فایل
  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // آیکون فایل
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image />;
    if (mimeType.startsWith('video/')) return <VideoLibrary />;
    if (mimeType === 'application/pdf') return <PictureAsPdf />;
    return <InsertDriveFile />;
  };

  useEffect(() => {
    fetchFiles(1);
  }, [searchTerm, filterType, sortBy, sortOrder]);

  return (
    <Box>
      {/* هدر */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">مدیریت فایل‌ها</Typography>
        <Box display="flex" gap={1}>
          <Button onClick={() => fetchFiles(currentPage)} startIcon={<Refresh />}>
            بروزرسانی
          </Button>
          {showUpload && (
            <Button
              variant="contained"
              startIcon={<CloudUpload />}
              onClick={() => {/* نمایش dialog آپلود */}}
              disabled={uploading}
            >
              آپلود فایل
            </Button>
          )}
        </Box>
      </Box>

      {/* فیلترها و جستجو */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
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
                  )
                }}
                size="small"
              />
            </Grid>

            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
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
            </Grid>

            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>مرتب‌سازی</InputLabel>
                <Select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order as 'asc' | 'desc');
                  }}
                >
                  <MenuItem value="created_at-desc">جدیدترین</MenuItem>
                  <MenuItem value="created_at-asc">قدیمی‌ترین</MenuItem>
                  <MenuItem value="original_name-asc">نام (الف-ی)</MenuItem>
                  <MenuItem value="original_name-desc">نام (ی-الف)</MenuItem>
                  <MenuItem value="file_size-desc">بزرگترین</MenuItem>
                  <MenuItem value="file_size-asc">کوچکترین</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box display="flex" justifyContent="flex-end" gap={1}>
                <IconButton
                  onClick={() => setViewMode('grid')}
                  color={viewMode === 'grid' ? 'primary' : 'default'}
                >
                  <GridView />
                </IconButton>
                <IconButton
                  onClick={() => setViewMode('list')}
                  color={viewMode === 'list' ? 'primary' : 'default'}
                >
                  <ViewList />
                </IconButton>
              </Box>
            </Grid>
          </Grid>

          {selectionMode !== 'none' && selectedFiles.length > 0 && (
            <Box mt={2}>
              <Chip
                label={`${selectedFiles.length} فایل انتخاب شده`}
                onDelete={() => setSelectedFiles([])}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* محتوای اصلی */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : files.length === 0 ? (
        <Box textAlign="center" p={4}>
          <Typography variant="h6" color="text.secondary">
            هیچ فایلی یافت نشد
          </Typography>
        </Box>
      ) : viewMode === 'grid' ? (
        // نمایش شبکه‌ای
        <Grid container spacing={2}>
          {files.map((file) => {
            const isSelected = selectedFiles.find(f => f.id === file.id);

            return (
              <Grid item xs={6} sm={4} md={3} lg={2} key={file.id}>
                <Card
                  sx={{
                    cursor: selectionMode !== 'none' ? 'pointer' : 'default',
                    border: isSelected ? '2px solid #1976d2' : '1px solid #e0e0e0',
                    '&:hover': { boxShadow: 3 }
                  }}
                  onClick={() => toggleFileSelection(file)}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                >
                  {/* تصویر یا آیکون */}
                  {file.mime_type.startsWith('image/') ? (
                    <Box
                      component="img"
                      src={file.file_url}
                      alt={file.alt_text || file.original_name}
                      sx={{
                        width: '100%',
                        height: 120,
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      height={120}
                      bgcolor="grey.100"
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

                    {showDetails && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInfoDialogFile(file);
                        }}
                        sx={{ float: 'right' }}
                      >
                        <Info fontSize="small" />
                      </IconButton>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        // نمایش لیستی
        <Card>
          <List>
            {files.map((file, index) => {
              const isSelected = selectedFiles.find(f => f.id === file.id);

              return (
                <React.Fragment key={file.id}>
                  <ListItem
                    button={selectionMode !== 'none'}
                    selected={Boolean(isSelected)}
                    onClick={() => toggleFileSelection(file)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                  >
                    <ListItemIcon>
                      {file.mime_type.startsWith('image/') ? (
                        <Box
                          component="img"
                          src={file.file_url}
                          alt={file.original_name}
                          sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }}
                        />
                      ) : (
                        getFileIcon(file.mime_type)
                      )}
                    </ListItemIcon>

                    <ListItemText
                      primary={file.original_name}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            {formatFileSize(file.file_size)} • {file.mime_type}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(file.created_at).toLocaleDateString('fa-IR')}
                          </Typography>
                        </Box>
                      }
                    />

                    {showDetails && (
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setInfoDialogFile(file);
                        }}
                      >
                        <Info />
                      </IconButton>
                    )}
                  </ListItem>
                  {index < files.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        </Card>
      )}

      {/* صفحه‌بندی */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(e, page) => fetchFiles(page)}
            color="primary"
          />
        </Box>
      )}

      {/* منوی راست کلیک */}
      <Menu
        open={Boolean(contextMenu)}
        onClose={closeContextMenu}
        anchorEl={contextMenu?.anchorEl}
      >
        <MenuItemComp onClick={() => {
          if (contextMenu?.file) setInfoDialogFile(contextMenu.file);
          closeContextMenu();
        }}>
          <Info sx={{ mr: 1 }} />
          جزئیات
        </MenuItemComp>
        <MenuItemComp onClick={() => {
          if (contextMenu?.file) {
            window.open(contextMenu.file.file_url, '_blank');
          }
          closeContextMenu();
        }}>
          <Download sx={{ mr: 1 }} />
          دانلود
        </MenuItemComp>
      </Menu>

      {/* دیالوگ جزئیات فایل */}
      <FileInfoDialog
        file={infoDialogFile}
        open={Boolean(infoDialogFile)}
        onClose={() => setInfoDialogFile(null)}
        onUpdate={(updatedFile) => {
          setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
        }}
        onDelete={(fileId) => {
          setFiles(prev => prev.filter(f => f.id !== fileId));
          setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
        }}
      />
    </Box>
  );
}