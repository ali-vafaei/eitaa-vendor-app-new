import { useState } from "react";
import Avatar from "@mui/material/Avatar";
import Switch from "@mui/material/Switch";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import IconButton from "@mui/material/IconButton";
import { Edit, Delete, Visibility, Restore } from "@mui/icons-material";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";

// GLOBAL CUSTOM COMPONENTS
import { currency } from "lib";

// ===============================================================
interface Props {
  product: any;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  onTogglePublished: () => void;
  onRestore: () => void;
}
// ===============================================================

export default function ProductRow({
  product,
  onEdit,
  onDelete,
  onView,
  onTogglePublished,
  onRestore
}: Props) {
  const { id, name, thumbnail, brand, categories, price, published } = product;

  // ✨ تابع کمکی برای آدرس کامل عکس
  const getImageUrl = (imageUrl: string) => {
    if (!imageUrl) return "https://via.placeholder.com/40";

    // اگر آدرس کامل است، همان را برگردان
    if (imageUrl.startsWith('http')) return imageUrl;

    // اگر آدرس نسبی است، آدرس کامل بساز
    if (imageUrl.startsWith('/uploads')) {
      return `http://localhost:4000${imageUrl}`;
    }

    // در غیر این صورت، آدرس را همان‌طور برگردان
    return imageUrl;
  };

  // ✨ تابع کمکی برای نمایش دسته‌بندی
  const getCategoryDisplay = (categories: any) => {
    if (Array.isArray(categories) && categories.length > 0) {
      return categories[0]; // نمایش اولین دسته‌بندی
    }
    if (typeof categories === 'string') {
      return categories;
    }
    return '-';
  };

  return (
    <TableRow>
      {/* تصویر و نام محصول */}
      <TableCell>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar
            src={getImageUrl(thumbnail)} // ✨ استفاده از تابع کمکی
            alt={name}
            sx={{
              width: 40,
              height: 40,
              // اگر عکس لود نشد، حرف اول نام را نمایش بده
              bgcolor: thumbnail ? 'transparent' : 'primary.main'
            }}
          >
            {!thumbnail && name ? name.charAt(0).toUpperCase() : ''}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#666' }}>
              #{typeof id === 'string' ? id.split("-")[0] : id}
            </div>
          </div>
        </div>
      </TableCell>

      {/* دسته‌بندی */}
      <TableCell>
        {categories ? (
          <Chip
            label={getCategoryDisplay(categories)} // ✨ استفاده از تابع کمکی
            size="small"
            variant="outlined"
            sx={{ textTransform: 'capitalize' }}
          />
        ) : (
          <span style={{ color: '#999' }}>-</span>
        )}
      </TableCell>

      {/* برند */}
      <TableCell>
        {brand ? (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Avatar
              sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem' }}
            >
              {brand.charAt(0).toUpperCase()}
            </Avatar>
            <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {brand}
            </span>
          </div>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        )}
      </TableCell>

      {/* قیمت */}
      <TableCell>
        <div style={{ fontWeight: 500 }}>
          {currency(price)}
        </div>
      </TableCell>

      {/* وضعیت انتشار */}
      <TableCell>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Switch
            checked={published}
            onChange={onTogglePublished}
            color="primary"
            size="small"
          />
          <span style={{
            marginLeft: '8px',
            color: published ? '#4caf50' : '#f44336',
            fontSize: '0.875rem'
          }}>
            {published ? 'منتشر شده' : 'پیش‌نویس'}
          </span>
        </div>
      </TableCell>

      {/* دکمه‌های عملکرد */}
      <TableCell align="center">
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
          <Tooltip title="مشاهده محصول">
            <IconButton size="small" onClick={onView}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="ویرایش محصول">
            <IconButton size="small" onClick={onEdit}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* نمایش دکمه بازگردانی یا حذف بر اساس وضعیت */}
          {!published ? (
            <Tooltip title="بازگردانی محصول">
              <IconButton size="small" onClick={onRestore} color="success">
                <Restore fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="بایگانی محصول">
              <IconButton size="small" onClick={onDelete} color="warning">
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}