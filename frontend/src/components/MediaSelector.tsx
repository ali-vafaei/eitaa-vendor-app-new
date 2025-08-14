"use client";

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardMedia,
  IconButton,
  Typography,
  Grid,
  Chip
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Edit,
  Image,
  VideoLibrary,
  PictureAsPdf,
  InsertDriveFile
} from '@mui/icons-material';
import MediaGallery from './MediaGallery';

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

interface MediaSelectorProps {
  label?: string;
  selectedFiles?: MediaFile[];
  onFilesChange: (files: MediaFile[]) => void;
  allowMultiple?: boolean;
  acceptedTypes?: string[];
  maxFiles?: number;
  showPreview?: boolean;
  helperText?: string;
  required?: boolean;
  error?: boolean;
  errorText?: string;
}

// ========================= MEDIA SELECTOR COMPONENT =========================
export default function MediaSelector({
  label = "انتخاب فایل",
  selectedFiles = [],
  onFilesChange,
  allowMultiple = false,
  acceptedTypes = ['image/*'],
  maxFiles = 10,
  showPreview = true,
  helperText = "",
  required = false,
  error = false,
  errorText = ""
}: MediaSelectorProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);

  // دریافت آیکون بر اساس نوع فایل
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image color="primary" />;
    if (mimeType.startsWith('video/')) return <VideoLibrary color="primary" />;
    if (mimeType === 'application/pdf') return <PictureAsPdf color="primary" />;
    return <InsertDriveFile color="primary" />;
  };

  // فرمت سایز فایل
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // مدیریت انتخاب فایل از گالری
  const handleFileSelect = (file: MediaFile) => {
    if (allowMultiple) {
      // در حالت multiple، چک کنیم که فایل قبلاً انتخاب نشده باشد
      const isAlreadySelected = selectedFiles.find(f => f.id === file.id);
      if (!isAlreadySelected && selectedFiles.length < maxFiles) {
        onFilesChange([...selectedFiles, file]);
      }
    } else {
      // در حالت single، فایل جدید جایگزین فایل قبلی می‌شود
      onFilesChange([file]);
    }
  };

  // حذف فایل از لیست انتخاب شده
  const handleRemoveFile = (fileId: number) => {
    onFilesChange(selectedFiles.filter(file => file.id !== fileId));
  };

  // بررسی اینکه آیا می‌توان فایل بیشتری اضافه کرد
  const canAddMore = allowMultiple && selectedFiles.length < maxFiles;

  return (
    <Box>
      {/* لیبل */}
      {label && (
        <Typography
          variant="body2"
          component="label"
          sx={{
            display: 'block',
            mb: 1,
            fontWeight: 500,
            color: error ? 'error.main' : 'text.primary'
          }}
        >
          {label}
          {required && <span style={{ color: 'red' }}> *</span>}
        </Typography>
      )}

      {/* دکمه انتخاب فایل */}
      {(selectedFiles.length === 0 || canAddMore) && (
        <Button
          variant="outlined"
          color={error ? "error" : "primary"}
          startIcon={<CloudUpload />}
          onClick={() => setGalleryOpen(true)}
          sx={{
            mb: showPreview && selectedFiles.length > 0 ? 2 : 0,
            borderStyle: 'dashed',
            borderWidth: 2,
            py: 2,
            px: 3
          }}
        >
          {selectedFiles.length === 0
            ? "انتخاب فایل از گالری"
            : `افزودن فایل (${selectedFiles.length}/${maxFiles})`
          }
        </Button>
      )}

      {/* پیش‌نمایش فایل‌های انتخاب شده */}
      {showPreview && selectedFiles.length > 0 && (
        <Box mt={2}>
          <Typography variant="body2" color="text.secondary" mb={1}>
            فایل‌های انتخاب شده:
          </Typography>

          <Grid container spacing={2}>
            {selectedFiles.map((file) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
                <Card sx={{ position: 'relative' }}>
                  {/* دکمه حذف */}
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemoveFile(file.id)}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      zIndex: 1,
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.9)'
                      }
                    }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>

                  {/* تصویر یا آیکون فایل */}
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
                        backgroundColor: '#f5f5f5',
                        flexDirection: 'column',
                        gap: 1
                      }}
                    >
                      {getFileIcon(file.mime_type)}
                      <Typography variant="caption" textAlign="center">
                        {file.original_name}
                      </Typography>
                    </Box>
                  )}

                  {/* اطلاعات فایل */}
                  <Box p={1}>
                    <Typography variant="caption" display="block" noWrap>
                      {file.original_name}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(file.file_size)}
                      </Typography>
                      {file.width && file.height && (
                        <Chip
                          label={`${file.width}×${file.height}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* متن راهنما */}
      {helperText && !error && (
        <Typography variant="caption" color="text.secondary" display="block" mt={1}>
          {helperText}
        </Typography>
      )}

      {/* متن خطا */}
      {error && errorText && (
        <Typography variant="caption" color="error.main" display="block" mt={1}>
          {errorText}
        </Typography>
      )}

      {/* گالری رسانه */}
      <MediaGallery
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={handleFileSelect}
        allowMultiple={allowMultiple}
        selectedFiles={selectedFiles}
        acceptedTypes={acceptedTypes}
      />
    </Box>
  );
}