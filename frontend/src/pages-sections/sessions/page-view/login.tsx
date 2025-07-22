// src/pages-sections/sessions/page-view/login.tsx (نسخه نهایی و اصلاح شده)

"use client";

import { useState } from "react";                  // ---> اضافه شد
import { useRouter } from "next/navigation";       // ---> اضافه شد
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";           // ---> اضافه شد
import { useFormik } from "formik";
import * as yup from "yup";
// LOCAL CUSTOM COMPONENTS
import EyeToggleButton from "../components/eye-toggle-button";
// LOCAL CUSTOM HOOK
import usePasswordVisible from "../use-password-visible";
// GLOBAL CUSTOM COMPONENTS
import BazaarTextField from "components/BazaarTextField";


const LoginPageView = ({ closeDialog }: { closeDialog?: () => void }) => {
  const { visiblePassword, togglePasswordVisible } = usePasswordVisible();
  const router = useRouter();                             // ---> اضافه شد
  const [apiError, setApiError] = useState("");           // ---> اضافه شد

  // LOGIN FORM FIELDS INITIAL VALUES
  const initialValues = { email: "", password: "" };

  // LOGIN FORM FIELD VALIDATION SCHEMA
  const validationSchema = yup.object().shape({
    password: yup.string().required("Password is required"),
    email: yup.string().email("invalid email").required("Email is required")
  });

  const {
    values,
    errors,
    touched,
    handleBlur,
    handleChange,
    handleSubmit,
    isSubmitting // ---> اضافه شد
  } = useFormik({
    initialValues,
    validationSchema,
    // ---> onSubmit به طور کامل تغییر کرد <---
    onSubmit: async (values, { setSubmitting }) => {
      setApiError(""); // ریست کردن خطای قبلی
      try {
        const response = await fetch('http://localhost:4000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: values.email,
            password: values.password
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'خطا در ورود');
        }

        // ذخیره توکن در حافظه مرورگر
        localStorage.setItem('vendor_token', data.token);

        // بستن دیالوگ در صورت وجود و هدایت به داشبورد
        closeDialog?.();
        router.push('/vendor/dashboard');

      } catch (error: any) {
        setApiError(error.message);
      } finally {
        setSubmitting(false);
      }
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      {/* نمایش خطای API */}
      {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

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
        label="Email or Phone Number"
        placeholder="exmple@mail.com"
        helperText={touched.email && errors.email}
        error={Boolean(touched.email && errors.email)}
        disabled={isSubmitting} // ---> اضافه شد
      />

      <BazaarTextField
        mb={2}
        fullWidth
        size="small"
        name="password"
        label="Password"
        autoComplete="on"
        variant="outlined"
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.password}
        placeholder="*********"
        type={visiblePassword ? "text" : "password"}
        helperText={touched.password && errors.password}
        error={Boolean(touched.password && errors.password)}
        disabled={isSubmitting} // ---> اضافه شد
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
        disabled={isSubmitting} // دکمه در حین ارسال غیرفعال می‌شود
      >
        Login
      </Button>
    </form>
  );
};

export default LoginPageView;