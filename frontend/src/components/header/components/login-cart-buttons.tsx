"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// MUI COMPONENTS
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import Person from "@mui/icons-material/Person";
import PersonOutline from "@mui/icons-material/PersonOutline";

// CUSTOM ICON COMPONENT
import ShoppingBagOutlined from "icons/ShoppingBagOutlined";

// GLOBAL CUSTOM HOOK & UTILS
import useCart from "hooks/useCart";
import authApi from "utils/__api__/auth";

// ==============================================================
interface Props {
  toggleDialog: () => void;
  toggleSidenav: () => void;
}
// ==============================================================

export default function LoginCartButtons({ toggleDialog, toggleSidenav }: Props) {
  const router = useRouter();
  const { state } = useCart();
  const [user, setUser] = useState<any>(null);

  // این هوک بعد از رندر شدن کامپوننت در مرورگر اجرا می‌شود
  // و وضعیت لاگین کاربر را از localStorage چک می‌کند
  useEffect(() => {
    const currentUser = authApi.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const ICON_COLOR = { color: "grey.600" };

  return (
    <div>
      {/* دکمه ورود یا پروفایل کاربر */}
      {user ? (
        // اگر کاربر لاگین کرده باشد، آیکن پروفایل نمایش داده می‌شود
        <IconButton onClick={() => router.push("/profile")}>
          <Person sx={ICON_COLOR} />
        </IconButton>
      ) : (
        // در غیر این صورت، آیکن ورود نمایش داده می‌شود که دیالوگ را باز می‌کند
        <IconButton onClick={toggleDialog}>
          <PersonOutline sx={ICON_COLOR} />
        </IconButton>
      )}

      {/* دکمه سبد خرید */}
      <Badge badgeContent={state.cart.length} color="primary">
        <IconButton onClick={toggleSidenav}>
          <ShoppingBagOutlined sx={ICON_COLOR} />
        </IconButton>
      </Badge>
    </div>
  );
}
