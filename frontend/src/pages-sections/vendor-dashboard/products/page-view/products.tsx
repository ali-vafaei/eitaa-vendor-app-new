"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import IconButton from "@mui/material/IconButton";
import { Edit, Delete, Visibility, Add, Restore } from "@mui/icons-material";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

// GLOBAL CUSTOM COMPONENTS
import { TableHeader, TablePagination } from "components/data-table";
import Scrollbar from "components/scrollbar";

// CUSTOM UTILS LIBRARY FUNCTION
import { currency } from "lib";

// LOCAL CUSTOM COMPONENT
import ProductRow from "../product-row";
import PageWrapper from "../../page-wrapper";

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

  // STATES
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // 🔥 STATE های جدید برای فیلتر
  const [showDrafts, setShowDrafts] = useState(false);
 const [showAll, setShowAll] = useState(true); // 🔥 پیش‌فرض روی "همه" باشه

  // 🔥 بارگذاری محصولات با فیلتر
  const fetchProducts = async () => {
  try {
    setLoading(true);

    let endpoint = 'http://localhost:4000/api/products/all'; // 🔥 پیش‌فرض همه باشه

    if (!showAll && !showDrafts) {
      endpoint = 'http://localhost:4000/api/products'; // فقط منتشر شده‌ها
    } else if (showDrafts) {
      endpoint = 'http://localhost:4000/api/products/drafts'; // فقط پیش‌نویس‌ها
    }

    console.log('🔍 Fetching from:', endpoint); // برای debug

    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error('خطا در بارگذاری محصولات');
    }
    const data = await response.json();

    console.log('📦 Products loaded:', data.length); // برای debug
    setProducts(data);
  } catch (error) {
    console.error('خطا در بارگذاری محصولات:', error);
    enqueueSnackbar('خطا در بارگذاری محصولات', { variant: 'error' });
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchProducts();
  }, [showDrafts, showAll]); // هر بار که فیلتر تغییر کرد، دوباره بارگذاری کن

  // فیلتر کردن محصولات بر اساس جستجو
  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.categories?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // پیجینیشن
  const ITEMS_PER_PAGE = 10;
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  // هندل کردن تغییر صفحه
  const handlePageChange = (event: any, newPage: number) => {
    setPage(newPage);
  };

  // باز کردن دیالوگ حذف
  const handleDeleteClick = (product: any) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  // تأیید حذف محصول (حالا فقط مخفی می‌کنه)
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    try {
      const response = await fetch(`http://localhost:4000/api/products/${productToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('خطا در حذف محصول');
      }

      enqueueSnackbar('محصول با موفقیت بایگانی شد', { variant: 'success' });
      fetchProducts(); // بارگذاری مجدد لیست
    } catch (error) {
      console.error('خطا در حذف محصول:', error);
      enqueueSnackbar('خطا در حذف محصول', { variant: 'error' });
    }

    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  // لغو حذف
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  // 🔥 بازگردانی محصول
  const handleRestore = async (product: any) => {
    try {
      const response = await fetch(`http://localhost:4000/api/products/${product.id}/restore`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('خطا در بازگردانی محصول');
      }

      enqueueSnackbar('محصول با موفقیت بازگردانی شد', { variant: 'success' });
      fetchProducts(); // بارگذاری مجدد لیست
    } catch (error) {
      console.error('خطا در بازگردانی محصول:', error);
      enqueueSnackbar('خطا در بازگردانی محصول', { variant: 'error' });
    }
  };

  // تغییر وضعیت انتشار
const handleTogglePublished = async (product: any) => {
  try {
    // استفاده از endpoint مخصوص toggle که ساختیم
    const response = await fetch(`http://localhost:4000/api/products/${product.id}/toggle-publish`, {
      method: 'PATCH',
    });

    if (!response.ok) {
      throw new Error('خطا در تغییر وضعیت انتشار');
    }

    const result = await response.json();
    enqueueSnackbar('وضعیت انتشار تغییر کرد', { variant: 'success' });

    // 🚨 مهم: فقط اگر در حالت "همه" هستیم، محصول رو جا به جا کن
    // وگرنه لیست رو دوباره بارگذاری کن
    if (showAll) {
      // در حالت همه، محصول باید همچنان نمایش داده بشه
      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.id === product.id ? { ...p, published: result.published } : p
        )
      );
    } else {
      // در حالت‌های دیگر، محصول از لیست حذف می‌شه (طبیعی)
      fetchProducts();
    }
  } catch (error) {
    console.error('خطا در تغییر وضعیت انتشار:', error);
    enqueueSnackbar('خطا در تغییر وضعیت انتشار', { variant: 'error' });
  }
};
  // شمارش محصولات برای دکمه‌ها
  const publishedCount = products.filter(p => p.published).length;
  const draftCount = products.filter(p => !p.published).length;
  const totalCount = products.length;

  return (
    <PageWrapper title="Product List">
      <Card>
        {/* 🔥 هدر جدید با دکمه‌های فیلتر */}
        <Box sx={{ p: 2 }}>
          {/* ردیف اول: جستجو */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <TextField
              size="small"
              placeholder="جستجو در محصولات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ width: 300 }}
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => router.push('/admin/products/create')}
            >
              اضافه کردن محصول
            </Button>
          </Box>

          {/* ردیف دوم: دکمه‌های فیلتر */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={!showDrafts && !showAll ? "contained" : "outlined"}
              onClick={() => {
                setShowDrafts(false);
                setShowAll(false);
              }}
              size="small"
              color="success"
            >
              منتشر شده ({publishedCount})
            </Button>

            <Button
              variant={showDrafts ? "contained" : "outlined"}
              onClick={() => {
                setShowDrafts(true);
                setShowAll(false);
              }}
              size="small"
              color="warning"
            >
              پیش‌نویس ({draftCount})
            </Button>

            <Button
              variant={showAll ? "contained" : "outlined"}
              onClick={() => {
                setShowDrafts(false);
                setShowAll(true);
              }}
              size="small"
              color="secondary"
            >
              همه ({totalCount})
            </Button>
          </Box>
        </Box>

        {/* جدول */}
        <Scrollbar>
          <TableContainer sx={{ minWidth: 900 }}>
            <Table>
              <TableHeader
                order="desc"
                hideSelectBtn
                orderBy="name"
                heading={tableHeading}
                rowCount={products.length}
                numSelected={0}
                onRequestSort={() => {}}
              />

              <TableBody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                      در حال بارگذاری...
                    </td>
                  </tr>
                ) : paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                      هیچ محصولی یافت نشد
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((product: any) => (
                    <ProductRow
                      key={product.id}
                      product={product}
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

        {/* پیجینیشن */}
        <Stack alignItems="center" my={4}>
          <TablePagination
            onChange={handlePageChange}
            count={Math.ceil(totalPages)}
            page={page}
          />
        </Stack>
      </Card>

      {/* دیالوگ تأیید حذف */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          تأیید بایگانی محصول
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            آیا مطمئن هستید که می‌خواهید محصول "{productToDelete?.name}" را بایگانی کنید؟
            محصول حذف نمی‌شود، فقط از نمایش عمومی مخفی می‌شود.
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