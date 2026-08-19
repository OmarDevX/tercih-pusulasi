"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { DEFAULT_COMPARE_PATH } from "../routes";

type CompareNavLinkProps = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
};

export default function CompareNavLink({
  children,
  className,
  ariaLabel,
}: CompareNavLinkProps) {
  const resetScrollBeforeNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    // Reset synchronously, before Next swaps route segments. This prevents a
    // previously scrolled page from exposing the persistent footer while the
    // comparison route is streaming its server payload.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  return (
    <Link
      href={DEFAULT_COMPARE_PATH}
      className={className}
      aria-label={ariaLabel}
      scroll
      onClick={resetScrollBeforeNavigation}
    >
      {children}
    </Link>
  );
}
