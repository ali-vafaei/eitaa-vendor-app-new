"use client";

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
import { useRouter } from "next/navigation"; // اضافه شده برای هدایت کاربر پس از ثبت نام

const RegisterPageView = () => {
  const { visiblePassword, togglePasswordVisible } = usePasswordVisible();
  const router = useRouter(); // اضافه شده برای هدایت کاربر پس از ثبت نام

  // COMMON INPUT PROPS FOR TEXT FIELD
  const inputProps = {
    endAdornment: <EyeToggleButton show={visiblePassword} click={togglePasswordVisible} />,
  };

  // REGISTER FORM FIELDS INITIAL VALUES
  const initialValues = {
    accountType: "customer", // انتخاب پیش‌فرض مشتری
    name: "",
    email: "",
    password: "",
    re_password: "",
    agreement: false,
  };

  // REGISTER FORM FIELD VALIDATION SCHEMA
const validationSchema = yup.object().shape({
  accountType: yup.string().required("Please select an account type"),
  name: yup.string().when("accountType", {
    is: "customer",
    then: yup.string().required("Name is required"),
    otherwise: yup.string().notRequired(),
  }),
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup.string().required("Password is required"),
  re_password: yup
    .string()
    .oneOf([yup.ref("password"), null], "Passwords must match")
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
    onSubmit: async (values) => {
      const endpoint =
        values.accountType === "customer"
          ? "/api/auth/register/customer"
          : "/api/auth/register/seller"; // مسیر ثبت نام متفاوت بر اساس نوع حساب
      try {
        const response = await fetch(`http://localhost:4000${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const data = await response.json();
        if (response.ok) {
          router.push(values.accountType === "customer" ? "/profile" : "/admin"); // هدایت کاربر بر اساس نوع حساب
        } else {
          alert(data.message || "خطا در ثبت‌نام");
        }
      } catch (error) {
        console.error("Register Error:", error);
        alert("خطا در ارتباط با سرور");
      }
    },
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

      {values.accountType === "customer" && (
        <BazaarTextField
          mb={1.5}
          fullWidth
          name="name"
          size="small"
          label="Full Name"
          variant="outlined"
          onBlur={handleBlur}
          value={values.name}
          onChange={handleChange}
          placeholder="Ralph Awards"
          error={!!touched.name && !!errors.name}
          helperText={(touched.name && errors.name) as string}
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
        label="Email or Phone Number"
        placeholder="exmple@mail.com"
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
        helperText={touched.password && errors.password}
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
        helperText={touched.re_password && errors.re_password}
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