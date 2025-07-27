"use client";

import Link from "next/link";
import { FC, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Avatar from "@mui/material/Avatar";
import Rating from "@mui/material/Rating";
import Button from "@mui/material/Button";
// MUI ICON COMPONENTS
import Add from "@mui/icons-material/Add";
import Remove from "@mui/icons-material/Remove";
// GLOBAL CUSTOM HOOK
import useCart from "hooks/useCart";
// GLOBAL CUSTOM COMPONENTS
import LazyImage from "components/LazyImage";
import { H1, H2, H3, H6 } from "components/Typography";
import { FlexBox, FlexRowCenter } from "components/flex-box";
// CUSTOM UTILS LIBRARY FUNCTION
import { currency } from "lib";
// DUMMY DATA
import productVariants from "data/product-variants";
// CUSTOM DATA MODEL
import Product from "models/Product.model";

// ================================================================
type Props = { product: Product };
// ================================================================

export default function ProductIntro({ product }: Props) {
  // Destructure properties with fallbacks to prevent errors if product is null
  const {
    id,
    price = 0,
    title = "محصول بدون عنوان",
    images,
    slug,
    thumbnail,
    brand,
    rating,
  } = product || {};

  const { state, dispatch } = useCart();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectVariants, setSelectVariants] = useState({
    option: "option 1",
    type: "type 1",
  });

  // ✨ تابع کمکی برای تبدیل آدرس نسبی به کامل
  const getFullImageUrl = (imageUrl: string) => {
    if (!imageUrl) return "/assets/images/products/placeholder.png";
    if (imageUrl.startsWith('http')) return imageUrl;
    if (imageUrl.startsWith('/uploads')) {
      return `http://localhost:4000${imageUrl}`;
    }
    return imageUrl;
  };

  // ✨✨✨ راه حل نهایی و ضدخطا اینجاست ✨✨✨
  // 1. یک لیست عکس امن می‌سازیم که تضمین شده یک آرایه است.
  const imageList =
    (images && Array.isArray(images) && images.length > 0)
      ? images.map(img => getFullImageUrl(img)) // ✨ آدرس کامل برای هر عکس
      : thumbnail
      ? [getFullImageUrl(thumbnail)] // ✨ آدرس کامل برای thumbnail
      : ["/assets/images/products/placeholder.png"]; // یک عکس جایگزین در صورت نبود هیچ عکسی

  // 2. اطمینان حاصل می‌کنیم که ایندکس عکس انتخابی معتبر است.
  const safeSelectedImage = Math.min(selectedImage, imageList.length - 1);
  const selectedImageUrl = imageList[safeSelectedImage];

  // HANDLE CHANGE TYPE AND OPTIONS
  const handleChangeVariant = (variantName: string, value: string) => () => {
    setSelectVariants((state) => ({
      ...state,
      [variantName.toLowerCase()]: value,
    }));
  };

  // CHECK PRODUCT EXIST OR NOT IN THE CART
  const cartItem = state.cart.find((item) => item.id === id);

  // HANDLE SELECT IMAGE
  const handleImageClick = (ind: number) => () => setSelectedImage(ind);

  // HANDLE CHANGE CART
  const handleCartAmountChange = (amount: number) => () => {
    dispatch({
      type: "CHANGE_CART_AMOUNT",
      payload: { price, qty: amount, name: title, imgUrl: getFullImageUrl(thumbnail), id, slug }, // ✨ آدرس کامل
    });
  };

  // ✨ دیباگ: بررسی آدرس عکس‌ها
  console.log('🖼️ ProductIntro Debug:', {
    thumbnail,
    images,
    imageList,
    selectedImageUrl
  });

  return (
    <Box width="100%">
      <Grid container spacing={3} justifyContent="space-around">
        {/* IMAGE GALLERY AREA */}
        <Grid item md={6} xs={12} alignItems="center">
          <FlexBox borderRadius={3} overflow="hidden" justifyContent="center" mb={6}>
            <LazyImage
              alt={title}
              width={300}
              height={300}
              loading="eager"
              src={selectedImageUrl} // 3. از URL امن استفاده می‌کنیم
              sx={{ objectFit: "contain" }}
              onError={(e) => {
                console.error('❌ Image load error:', selectedImageUrl);
                // در صورت خطا، عکس پیش‌فرض نمایش بده
                e.currentTarget.src = "/assets/images/products/placeholder.png";
              }}
            />
          </FlexBox>

          <FlexBox overflow="auto">
            {imageList.map((url, ind) => ( // 4. از لیست عکس امن برای map استفاده می‌کنیم
              <FlexRowCenter
                key={ind}
                width={64}
                height={64}
                minWidth={64}
                bgcolor="white"
                border="1px solid"
                borderRadius="10px"
                ml={ind === 0 ? "auto" : 0}
                style={{ cursor: "pointer" }}
                onClick={handleImageClick(ind)}
                mr={ind === imageList.length - 1 ? "auto" : "10px"}
                borderColor={selectedImage === ind ? "primary.main" : "grey.400"}>
                <Avatar
                  alt="product"
                  src={url}
                  variant="square"
                  sx={{ height: 40 }}
                  onError={(e) => {
                    console.error('❌ Thumbnail error:', url);
                    e.currentTarget.src = "/assets/images/products/placeholder.png";
                  }}
                />
              </FlexRowCenter>
            ))}
          </FlexBox>
        </Grid>

        {/* PRODUCT INFO AREA */}
        <Grid item md={6} xs={12} alignItems="center">
          {/* PRODUCT NAME */}
          <H1 mb={1}>{title}</H1>

          {/* PRODUCT BRAND */}
          <FlexBox alignItems="center" mb={1}>
            <div>Brand: </div>
            <H6>{brand || "N/A"}</H6>
          </FlexBox>

          {/* PRODUCT RATING */}
          <FlexBox alignItems="center" gap={1} mb={2}>
            <Box lineHeight="1">Rated:</Box>
            <Rating color="warn" value={rating || 0} readOnly />
            <H6 lineHeight="1">(50)</H6>
          </FlexBox>

          {/* PRODUCT VARIANTS */}
          {productVariants.map((variant) => (
            <Box key={variant.id} mb={2}>
              <H6 mb={1}>{variant.title}</H6>

              {variant.values.map(({ id, value }) => (
                <Chip
                  key={id}
                  label={value}
                  onClick={handleChangeVariant(variant.title, value)}
                  sx={{ borderRadius: "4px", mr: 1, cursor: "pointer" }}
                  color={
                    selectVariants[variant.title.toLowerCase()] === value ? "primary" : "default"
                  }
                />
              ))}
            </Box>
          ))}

          {/* PRICE & STOCK */}
          <Box pt={1} mb={3}>
            <H2 color="primary.main" mb={0.5} lineHeight="1">
              {currency(price)}
            </H2>
            <Box color="inherit">Stock Available</Box>
          </Box>

          {/* ADD TO CART BUTTON */}
          {!cartItem?.qty ? (
            <Button
              color="primary"
              variant="contained"
              onClick={handleCartAmountChange(1)}
              sx={{ mb: 4.5, px: "1.75rem", height: 40 }}>
              Add to Cart
            </Button>
          ) : (
            <FlexBox alignItems="center" mb={4.5}>
              <Button
                size="small"
                sx={{ p: 1 }}
                color="primary"
                variant="outlined"
                onClick={handleCartAmountChange(cartItem?.qty - 1)}>
                <Remove fontSize="small" />
              </Button>

              <H3 fontWeight="600" mx={2.5}>
                {cartItem?.qty.toString().padStart(2, "0")}
              </H3>

              <Button
                size="small"
                sx={{ p: 1 }}
                color="primary"
                variant="outlined"
                onClick={handleCartAmountChange(cartItem?.qty + 1)}>
                <Add fontSize="small" />
              </Button>
            </FlexBox>
          )}

          {/* SHOP NAME */}
          <FlexBox alignItems="center" gap={1} mb={2}>
            <div>Sold By:</div>
            <Link href="/shops/scarlett-beauty">
              <H6>Mobile Store</H6>
            </Link>
          </FlexBox>
        </Grid>
      </Grid>
    </Box>
  );
}