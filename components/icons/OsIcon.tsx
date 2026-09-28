"use client";
import { zh } from "@/lib/i18n/zh";


import { useState } from "react";

type OsIconProps = {
  src: string;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
};

export function OsIcon({ src, alt = "", className, fallback }: OsIconProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return <>{fallback ?? null}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={zh(alt)}
      className={className}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}
