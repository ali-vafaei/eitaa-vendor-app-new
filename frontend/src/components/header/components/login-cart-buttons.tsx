
import { useEffect, useState } from "react";
import { useRouter } from "next/router"; // 👈 ایمپورت use router
import Badge from "@mui/material/Badge";
import Dialog from "@mui/material/Dialog"; // 👈 ایمپورت Dialog
import IconButton from "@mui/material/IconButton";
// MUI ICON COMPONENTS
import Person from "@mui/icons-material/Person"; // 👈 ایمپورت آیکن Person
import PersonOutline from "@mui/icons-material/PersonOutline";
// CUSTOM ICON COMPONENT
import ShoppingBagOutlined from "icons/ShoppingBagOutlined";
// GLOBAL CUSTOM HOOK
import useCart from "hooks/useCart";
import authApi from "utils/__api__/auth";


// ==============================================================
interface Props {
  dialogOpen: boolean; // 👈 پراپرتی برای کنترل Dialog
  toggleDialog: () => void;
  toggleSidenav: () => void;
}
// ==============================================================

export default function LoginCartButtons({
  dialogOpen,
  toggleDialog,
  toggleSidenav,
}: Props) {
  const router = useRouter();
  const { state } = useCart();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const currentUser = authApi.getCurrentUser();
    setUser(currentUser);
  }, []);

  const ICON_COLOR = { color: "grey.600" };

  return (
    <div>
      {/* بخش شرطی به اینجا منتقل شد */}
      {user ? (
        // اگه کاربر لاگین کرده بود، این دکمه نمایش داده میشه
        <IconButton onClick={() => router.push("/profile")}>
          <Person sx={ICON_COLOR} />
        </IconButton>
      ) : (
        // اگه کاربر لاگین نکرده بود، با کلیک روی این دکمه دیالوگ باز میشه
        <IconButton onClick={toggleDialog}>
          <PersonOutline sx={ICON_COLOR} />
        </IconButton>
      )}

      <Badge badgeContent={state.cart.length} color="primary">
        <IconButton onClick={toggleSidenav}>
          <ShoppingBagOutlined sx={ICON_COLOR} />
        </IconButton>
      </Badge>

      {/* دیالوگ ورود خارج از شرط ولی داخل کامپوننت قرار میگیره */}
      <Dialog scroll="body" open={dialogOpen} onClose={toggleDialog}>
        {/* ... محتوای دیالوگ شما مثل فرم ورود */}
        {/* مثلا: <LoginComponent /> */}
      </Dialog>
    </div>
  );
}