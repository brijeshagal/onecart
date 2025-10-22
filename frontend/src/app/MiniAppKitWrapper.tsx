"use client";

import sdk from "@farcaster/miniapp-sdk";
import { useEffect } from "react";

export default function MiniAppKitWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    sdk.actions.ready();
    sdk.back.enableWebNavigation();
  }, []);

  return <>{children}</>;
}
