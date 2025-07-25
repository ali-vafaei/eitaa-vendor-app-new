"use client";
import { useRouter } from "next/navigation";
import authApi from "utils/__api__/auth";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import RadioGroup from "@mui/material/RadioGroup";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Radio from "@mui/material/Radio";
import { useFormik } from "formik";
import * as yup from "yup";
// LOCAL CUSTOM COMPONENTS
import EyeToggleButton from "../components/eye-toggle-button";
// LOCAL CUSTOM HOOK
import BoxLink from "../components/box-link";
import usePasswordVisible from "../use-password-visible";
// GLOBAL CUSTOM COMPONENTS
import { Span } from "components/Typography";
import { FlexBox } from "components/flex-box";
import BazaarTextField from "components/BazaarTextField";


const RegisterPageView = () => {
  const { visiblePassword, togglePasswordVisible } = usePasswordVisible();
  const router = useRouter();

  // COMMON INPUT PROPS FOR TEXT FIELD
  const inputProps = {
    endAdornment: <EyeToggleButton show={visiblePassword} click={togglePasswordVisible} />,
  };

  // ✅ تغییر ۱: مقادیر اولیه
  const initialValues = {
    accountType: "customer",
    first_name: "", // از 'name' به 'first_name' تغییر کرد
    email: "",
    password: "",
    re_password: "",
    agreement: false,
  };

  // ✅ تغییر ۲: قوانین اعتبارسنجی
  const validationSchema = yup.object().shape({
    accountType: yup.string().required("Please select an account type"),
    first_name: yup.string().when("accountType", { // از 'name' به 'first_name' تغییر کرد
      is: "customer",
      then: (schema) => schema.required("First name is required"),
    }),
    email: yup.string().email("Invalid email").required("Email is required"),
    password: yup.string().required("Password is required"),
    re_password: yup
      .string()
      .oneOf([yup.ref("password")], "Passwords must match")
      .required("Please re-type password"),
    agreement: yup
      .bool()
      .test(
        "agreement",
        "You have to agree with our Terms and Conditions!",
        (value) => value === true
      )
      .required("You have to agree with our Terms and Conditions!"),
  });

  const { values, errors, touched, handleBlur, handleChange, handleSubmit } = useFormik({
    initialValues,
    validationSchema,
    // ✅ تغییر ۳: تابع ارسال
    onSubmit: async (values) => {
      try {
        // بررسی نوع حساب انتخاب شده توسط کاربر
        if (values.accountType === "customer") {
          // اگر کاربر "مشتری" را انتخاب کرده بود
          await authApi.registerCustomer({
            email: values.email,
            password: values.password,
            first_name: values.first_name,
          });
          // هدایت به صفحه پروفایل مشتری
          router.push("/profile");

        } else if (values.accountType === "seller") {
          // اگر کاربر "فروشنده" را انتخاب کرده بود
          await authApi.registerSeller({
            email: values.email,
            password: values.password,
            // فروشنده فقط ایمیل و پسورد نیاز دارد
          });
          // هدایت به داشبورد فروشنده
          router.push("/vendor/dashboard");
        }
     } catch (error: any) {
        console.error("DEBUG: Registration failed:", error);
        alert(error.message || "خطا در ثبت نام");
      }
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      <FormControl component="fieldset" sx={{ mb: 2 }}>
        <FormLabel component="legend">Account Type</FormLabel>
        <RadioGroup
          name="accountType"
          value={values.accountType}
          onChange={handleChange}
          row
        >
          <FormControlLabel value="customer" control={<Radio />} label="Customer" />
          <FormControlLabel value="seller" control={<Radio />} label="Seller" />
        </RadioGroup>
      </FormControl>

      {/* ✅ تغییر ۴: فیلد فرم */}
      {values.accountType === "customer" && (
        <BazaarTextField
          mb={1.5}
          fullWidth
          name="first_name" // از 'name' به 'first_name' تغییر کرد
          size="small"
          label="First Name" // از 'Full Name' به 'First Name' تغییر کرد
          variant="outlined"
          onBlur={handleBlur}
          value={values.first_name} // از 'values.name' به 'values.first_name' تغییر کرد
          onChange={handleChange}
          placeholder="Ali"
          error={!!touched.first_name && !!errors.first_name} // از 'name' به 'first_name' تغییر کرد
          helperText={(touched.first_name && errors.first_name) as string} // از 'name' به 'first_name' تغییر کرد
        />
      )}

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
        error={!!touched.email && !!errors.email}
        helperText={(touched.email && errors.email) as string}
      />

      <BazaarTextField
        mb={1.5}
        fullWidth
        size="small"
        name="password"
        label="Password"
        variant="outlined"
        autoComplete="on"
        placeholder="*********"
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.password}
        type={visiblePassword ? "text" : "password"}
        error={!!touched.password && !!errors.password}
        helperText={(touched.password && errors.password) as string}
        InputProps={inputProps}
      />

      <BazaarTextField
        fullWidth
        size="small"
        autoComplete="on"
        name="re_password"
        variant="outlined"
        label="Retype Password"
        placeholder="*********"
        onBlur={handleBlur}
        onChange={handleChange}
        value={values.re_password}
        type={visiblePassword ? "text" : "password"}
        error={!!touched.re_password && !!errors.re_password}
        helperText={(touched.re_password && errors.re_password) as string}
        InputProps={inputProps}
      />

      <FormControlLabel
        name="agreement"
        className="agreement"
        onChange={handleChange}
        control={<Checkbox size="small" color="secondary" checked={values.agreement || false} />}
        label={
          <FlexBox flexWrap="wrap" alignItems="center" justifyContent="flex-start" gap={1}>
            <Span display={{ sm: "inline-block", xs: "none" }}>By signing up, you agree to</Span>
            <Span display={{ sm: "none", xs: "inline-block" }}>Accept Our</Span>
            <BoxLink title="Terms & Condition" href="/" />
          </FlexBox>
        }
      />

      <Button fullWidth type="submit" color="primary" variant="contained" size="large">
        Create Account
      </Button>
    </form>
  );
};

export default RegisterPageView;