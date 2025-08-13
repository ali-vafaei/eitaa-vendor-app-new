import { Fragment } from "react";
import { SvgIconComponent } from "@mui/icons-material";
// GLOBAL CUSTOM COMPONENTS
import { Span } from "components/Typography";
// CUSTOM ICON COMPONENTS
import appIcons from "icons";

// ==============================================================
interface Props {
  title: string;
  icon?: string; // ۱. پراپ آیکون را اختیاری می‌کنیم
}
// ==============================================================

export default function ListItem({ title, icon }: Props) {
  // ۲. فقط در صورتی که نام آیکون وجود داشته باشد، به دنبال کامپوننت آن می‌گردیم
  const Icon = icon ? (appIcons[icon] as SvgIconComponent) : null;

  return (
    <Fragment>
      {/* ۳. فقط در صورتی که کامپوننت آیکون با موفقیت پیدا شد، آن را نمایش می‌دهیم */}
      {Icon && <Icon fontSize="small" />}

      <Span fontWeight="600">{title}</Span>
    </Fragment>
  );
}