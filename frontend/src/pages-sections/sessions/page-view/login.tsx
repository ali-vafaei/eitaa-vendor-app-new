"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as yup from "yup";

// MUI COMPONENTS
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

// GLOBAL CUSTOM COMPONENTS
import BazaarTextField from "components/BazaarTextField";

// LOCAL CUSTOM COMPONENTS & HOOKS
import EyeToggleButton from "../components/eye-toggle-button";
import usePasswordVisible from "../use-password-visible";

// API
import authApi from "utils/__api__/auth";

// TYPE DEFINITION
type UserType = "customer" | "seller";

const LoginPageView = () => {
  const router = useRouter();
  const [apiError, setApiError] = useState("");
  const { visiblePassword, togglePasswordVisible } = usePasswordVisible();

  // فیلدهای فرم
  const initialValues = { email: "", password: "" };

  // اعتبارسنجی
  const validationSchema = yup.object().shape({
    email: yup.string().email("ایمیل نامعتبر").required("ایمیل الزامی است"),
    password: yup.string().required("رمز عبور الزامی است")
  });

  const { values, errors, touched, handleBlur, handleChange, handleSubmit, isSubmitting } = useFormik({
    initialValues,
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setApiError("");
      try {
        await authApi.loginCustomer({
          email: values.email,
          password: values.password
        });

        // موفقیت آمیز - به صفحه پروفایل منتقل شود
        router.push("/profile");
      } catch (error: any) {
        setApiError(error.message || "خطا در ورود");
        setSubmitting(false);
      }
    }
  });

  return (
    <form onSubmit={handleSubmit}>
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
        label="Email"
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