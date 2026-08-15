"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { trackEvent, type ProductEvent } from "@/lib/analytics";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  event: ProductEvent;
  children: ReactNode;
};
export function IntentLink({ event, children, onClick, ...props }: Props) {
  return (
    <a
      {...props}
      onClick={(click) => {
        trackEvent(event);
        onClick?.(click);
      }}
    >
      {children}
    </a>
  );
}
