"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as yup from "yup";

// MUI COMPONENTS
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

// LOCAL CUSTOM COMPONENTS
import EyeToggleButton from "../components/eye-toggle-button";
import usePasswordVisible from "../use-password-visible";

// GLOBAL CUSTOM COMPONENTS
import BazaarTextField from "components/BazaarTextField";

// TYPE DEFINITION
type UserType = "customer" | "seller";

const LoginPageView = ({ closeDialog }: { closeDialog?: () => void }) => {
  const { visiblePassword, togglePasswordVisible } = usePasswordVisible();
  const router = useRouter();
  const [apiError, setApiError] = useState("");
  const [userType, setUserType] = useState<UserType>("customer"); // State برای نوع کاربر

  // --- HANDLERS ---
  const handleUserTypeChange = (_: any, newUserType: UserType | null) => {
    // جلوگیری از null شدن مقدار
    if (newUserType !== null) {
      setUserType(newUserType);
    }
  };

  const {
    values,
    errors,
    touched,
    handleBlur,
    handleChange,
    handleSubmit,
    isSubmitting
  } = useFormik({
    initialValues: {
      email: "",
      password: ""
    },
    validationSchema: yup.object().shape({
      password: yup.string().required("رمز عبور الزامی است"),
      email: yup.string().email("ایمیل نامعتبر است").required("ایمیل الزامی است")
    }),
    onSubmit: async (values, { setSubmitting }) => {
      setApiError("");

      // تعیین اندپوینت و مسیر ریدایرکت بر اساس نوع کاربر
      const endpoint = userType === "customer"
        ? "http://localhost:4000/api/auth/customer/login"
        : "http://localhost:4000/api/auth/login";

      const redirectPath = userType === "customer" ? "/profile" : "/vendor/dashboard";

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'خطا در ورود. لطفاً دوباره تلاش کنید.');
        }

        // ذخیره توکن در حافظه مرورگر
        const tokenKey = userType === "customer" ? "customer_token" : "vendor_token";
        localStorage.setItem(tokenKey, data.token);
        localStorage.setItem("user", JSON.stringify(data.user)); // ذخیره اطلاعات کاربر

        // بستن دیالوگ و هدایت کاربر
        closeDialog?.();
        router.push(redirectPath);

      } catch (error: any) {
        setApiError(error.message);
      } finally {
        setSubmitting(false);
      }
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      {/* --- انتخاب نوع کاربر --- */}
      <Typography variant="body2" fontWeight={600} textAlign="center" mb={2}>
        ورود به عنوان:
      </Typography>
      <ToggleButtonGroup
        fullWidth
        exclusive
        color="primary"
        value={userType}
        onChange={handleUserTypeChange}
        sx={{ mb: 2 }}
      >
        <ToggleButton value="customer">مشتری</ToggleButton>
        <ToggleButton value="seller">فروشنده</ToggleButton>
      </ToggleButtonGroup>

      {/* --- نمایش خطای API --- */}
      {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

      {/* --- فیلدهای فرم --- */}
      <BazaarTextField
        mb={1.5}
        fullWidth
        name="email"
        size="small"
        type="email"
        variant="outlined"
        onBlur={handleBlur}
        value={values.email}
        onChange={handleChange}
        label="ایمیل"
        placeholder="example@mail.com"
        helperText={touched.email && errors.email}
        error={Boolean(touched.email && errors.email)}
        disabled={isSubmitting}
      />

      <BazaarTextField
        mb={2}
        fullWidth
        size="small"
        name="password"
        label="رمز عبور"
        autoComplete="on"
        variant="outlined"
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.password}
        placeholder="*********"
        type={visiblePassword ? "text" : "password"}
        helperText={touched.password && errors.password}
        error={Boolean(touched.password && errors.password)}
        disabled={isSubmitting}
        InputProps={{
          endAdornment: <EyeToggleButton show={visiblePassword} click={togglePasswordVisible} />
        }}
      />

      <Button
        fullWidth
        type="submit"
        color="primary"
        variant="contained"
        size="large"
        disabled={isSubmitting}
      >
        {isSubmitting ? "در حال ورود..." : "ورود"}
      </Button>
    </form>
  );
};

export default LoginPageView;