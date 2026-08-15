"use client";

import { useEffect } from "react";
import { signature } from "@/lib/signature";

export function Signature() {
  useEffect(() => {
    signature("SecretClock");
  }, []);
  return null;
}
