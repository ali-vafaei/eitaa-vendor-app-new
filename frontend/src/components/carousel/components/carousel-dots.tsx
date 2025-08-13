import { ReactNode } from "react";
import { BoxProps } from "@mui/material/Box";
// STYLED COMPONENTS
import { Dot, DotList } from "../styles";

// ==============================================================
interface Props extends BoxProps {
  dotColor?: string;
}
// ==============================================================

export default function CarouselDots({ dotColor, ...props }: Props) {
  return {
    customPaging: () => <Dot dotColor={dotColor} />,
    appendDots: (dots: ReactNode) => (
      // 1. The <Fragment> is replaced with a <div>
      // 2. The {...props} are moved here to the outer container
      <div {...props}>
        {/* 3. The props are removed from DotList */}
        <DotList component="ul">
          {dots}
        </DotList>
      </div>
    )
  };
}