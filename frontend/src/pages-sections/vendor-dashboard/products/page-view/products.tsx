"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import {
  Card, Stack, Table, TableBody, TableContainer, Box, Typography,
  Button, TextField, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, InputAdornment, IconButton,
  Grid, CardContent, CardActions, CardMedia, CircularProgress, Alert,
  useTheme, useMediaQuery, Chip // <-- Chip را برای نمایش برچسب‌ها اضافه می‌کنیم
} from "@mui/material";
import { Edit, Delete, Visibility, Add, Restore } from "@mui/icons-material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

// GLOBAL CUSTOM COMPONENTS
import { TableHeader, TablePagination } from "components/data-table";
import Scrollbar from "components/scrollbar";
import useMuiTable from "hooks/useMuiTable";
import { currency } from "lib";
import PageWrapper from "../../page-wrapper";
import ProductRow from "../product-row";

// TABLE HEADER COLUMN DATA
const tableHeading = [
  { id: "name", label: "Name", align: "left" },
  { id: "category", label: "Category", align: "left" },
  { id: "brand", label: "Brand", align: "left" },
  { id: "price", label: "Price", align: "left" },
  { id: "published", label: "Published", align: "left" },
  { id: "action", label: "Action", align: "center" }
];

export default function ProductsPageView() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // تمام State ها و توابع شما بدون تغییر باقی می‌مانند
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [showDrafts, setShowDrafts] = useState(false);
  const [showAll, setShowAll] = useState(true);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let endpoint = 'http://localhost:4000/api/products';
      if (showAll) endpoint = 'http://localhost:4000/api/products/all';
      else if (showDrafts) endpoint = 'http://localhost:4000/api/products/drafts';
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`خطا ${response.status}`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      enqueueSnackbar(`خطا در بارگذاری: ${error.message}`, { variant: 'error' });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [showDrafts, showAll]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const searchLower = searchTerm.toLowerCase().trim();
    return products.filter(product => {
      const name = (product.name || '').toString().toLowerCase();
      const brand = (product.brand || '').toString().toLowerCase();
      let categories = '';
      if (Array.isArray(product.categories)) categories = product.categories.join(' ').toLowerCase();
      else if (product.categories) categories = product.categories.toString().toLowerCase();
      const id = (product.id || '').toString();
      return name.includes(searchLower) || brand.includes(searchLower) || categories.includes(searchLower) || id.includes(searchLower);
    });
  }, [products, searchTerm]);

  const reshapedProducts = useMemo(() => {
    return filteredProducts.map((product) => ({
      id: product.id,
      name: product.name || 'بدون نام',
      category: Array.isArray(product.categories) ? product.categories[0] || '-' : product.categories || '-',
      brand: product.brand || '-',
      price: product.price || 0,
      published: product.published,
      thumbnail: product.thumbnail,
      slug: product.slug,
      originalProduct: product
    }));
  }, [filteredProducts]);

  const {
    order,
    orderBy,
    selected,
    rowsPerPage,
    filteredList,
    handleChangePage,
    handleRequestSort
  } = useMuiTable({
    listData: reshapedProducts,
    defaultOrderBy: "id",
    defaultOrder: "desc"
  });

  const handleDeleteClick = (product: any) => {
    setProductToDelete(product.originalProduct || product);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      const response = await fetch(`http://localhost:4000/api/products/${productToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('خطا در حذف محصول');
      enqueueSnackbar('محصول با موفقیت بایگانی شد', { variant: 'success' });
      fetchProducts();
    } catch (error) {
      enqueueSnackbar('خطا در حذف محصول', { variant: 'error' });
    }
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const handleRestore = async (product: any) => {
    const targetProduct = product.originalProduct || product;
    try {
      const response = await fetch(`http://localhost:4000/api/products/${targetProduct.id}/restore`, { method: 'PATCH' });
      if (!response.ok) throw new Error('خطا در بازگردانی محصول');
      enqueueSnackbar('محصول با موفقیت بازگردانی شد', { variant: 'success' });
      fetchProducts();
    } catch (error) {
      enqueueSnackbar('خطا در بازگردانی محصول', { variant: 'error' });
    }
  };

  const handleTogglePublished = async (product: any) => {
    const targetProduct = product.originalProduct || product;
    try {
      const response = await fetch(`http://localhost:4000/api/products/${targetProduct.id}/toggle-publish`, { method: 'PATCH' });
      if (!response.ok) throw new Error('خطا در تغییر وضعیت انتشار');
      enqueueSnackbar('وضعیت انتشار تغییر کرد', { variant: 'success' });
      fetchProducts();
    } catch (error) {
      enqueueSnackbar('خطا در تغییر وضعیت انتشار', { variant: 'error' });
    }
  };

  const handleClearSearch = () => setSearchTerm("");

  const publishedCount = products.filter(p => p.published).length;
  const draftCount = products.filter(p => !p.published).length;
  const totalCount = products.length;

  // کامپوننت نمایش کارت‌های موبایل (با اطلاعات بیشتر)
  const MobileView = () => (
    <Box sx={{ p: 2 }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 10 }}><CircularProgress /></Box>
      ) : filteredList.length === 0 ? (
        <Typography sx={{ p: 3, textAlign: 'center' }}>
          {searchTerm ? 'هیچ محصولی با این جستجو یافت نشد' : 'هیچ محصولی یافت نشد'}
        </Typography>
      ) : (
        <Stack spacing={2}>
          {filteredList.map((product: any) => (
            <Card key={product.id}>
              <CardMedia
                component="img"
                height="140"
                image={product.thumbnail || '/assets/images/placeholder.png'}
                alt={product.name}
                sx={{ objectFit: 'contain' }}
              />
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography gutterBottom variant="h6" component="div" noWrap sx={{ flexGrow: 1, mr: 1 }}>
                    {product.name}
                  </Typography>
                  <Chip
                    label={product.published ? "منتشر شده" : "پیش‌نویس"}
                    color={product.published ? "success" : "warning"}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  برند: {product.brand}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  دسته‌بندی: {product.category}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  موجودی: {product.stock}
                </Typography>
                <Typography variant="subtitle1" color="primary.main" fontWeight="bold" sx={{ mt: 1 }}>
                  {currency(product.price)}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', borderTop: '1px solid #eee' }}>
                <Button size="small" onClick={() => router.push(`/admin/products/${product.id}`)}>ویرایش</Button>
                <Button size="small" color="error" onClick={() => handleDeleteClick(product)}>حذف</Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );

  // کامپوننت نمایش جدول دسکتاپ
  const DesktopView = () => (
    <Scrollbar>
      <TableContainer sx={{ minWidth: 900 }}>
        <Table>
          <TableHeader
            order={order}
            hideSelectBtn
            orderBy={orderBy}
            heading={tableHeading}
            rowCount={filteredProducts.length}
            numSelected={0}
            onRequestSort={handleRequestSort}
          />
          <TableBody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}><CircularProgress /></td></tr>
            ) : filteredList.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>{searchTerm ? 'هیچ محصولی با این جستجو یافت نشد' : 'هیچ محصولی یافت نشد'}</td></tr>
            ) : (
              filteredList.map((product: any) => (
                <ProductRow
                  key={product.id}
                  product={product.originalProduct || product}
                  onEdit={() => router.push(`/admin/products/${product.id}`)}
                  onDelete={() => handleDeleteClick(product)}
                  onView={() => router.push(`/products/${product.slug || product.id}`)}
                  onTogglePublished={() => handleTogglePublished(product)}
                  onRestore={() => handleRestore(product)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Scrollbar>
  );

  return (
    <PageWrapper title="Product List">
      <Card>
        {/* بخش جستجو و فیلترها برای هر دو حالت مشترک است */}
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="جستجو در محصولات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>),
                endAdornment: searchTerm && (<InputAdornment position="end"><IconButton size="small" onClick={handleClearSearch}><ClearIcon /></IconButton></InputAdornment>)
              }}
            />
            <Button variant="contained" startIcon={<Add />} onClick={() => router.push('/admin/products/create')}>
              اضافه کردن محصول
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button variant={!showDrafts && !showAll ? "contained" : "outlined"} onClick={() => { setShowDrafts(false); setShowAll(false); }} size="small" color="success">
              منتشر شده ({publishedCount})
            </Button>
            <Button variant={showDrafts ? "contained" : "outlined"} onClick={() => { setShowDrafts(true); setShowAll(false); }} size="small" color="warning">
              پیش‌نویس ({draftCount})
            </Button>
            <Button variant={showAll ? "contained" : "outlined"} onClick={() => { setShowDrafts(false); setShowAll(true); }} size="small" color="secondary">
              همه ({totalCount})
            </Button>
            {searchTerm && <Box sx={{ ml: 2, color: 'text.secondary', fontSize: '0.875rem' }}>{filteredProducts.length} نتیجه یافت شد</Box>}
          </Box>
        </Box>

        {isMobile ? <MobileView /> : <DesktopView />}

        {/* بخش پیجینیشن برای هر دو حالت مشترک است */}
        <Stack alignItems="center" my={4}>
          <TablePagination
            onChange={handleChangePage}
            count={Math.ceil(filteredProducts.length / rowsPerPage)}
          />
        </Stack>
      </Card>

      {/* دیالوگ تأیید حذف برای هر دو حالت مشترک است */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
        <DialogTitle>تأیید بایگانی محصول</DialogTitle>
        <DialogContent>
          <DialogContentText>
            آیا مطمئن هستید که می‌خواهید محصول "{productToDelete?.name}" را بایگانی کنید؟
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>لغو</Button>
          <Button onClick={handleConfirmDelete} color="warning" autoFocus>
            بایگانی
          </Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
}
