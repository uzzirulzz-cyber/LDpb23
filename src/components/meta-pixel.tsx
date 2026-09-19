"use client";

import Script from "next/script";
import { useEffect } from "react";
import { META_PIXEL_ID, trackPageView } from "@/lib/pixel";

/**
 * Meta (Facebook) Pixel loader + PageView tracker.
 * Pixel ID: 1052867624415243
 * The pixel base code is injected via next/script with afterInteractive strategy.
 * A PageView event is fired on mount (deduped with the CAPI bridge via eventID).
 */
export function MetaPixel() {
  useEffect(() => {
    // Fire PageView once the pixel is ready
    const id = `pv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const t = setTimeout(() => trackPageView(id), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${META_PIXEL_ID}');
        fbq('track', 'PageView');
      `}
    </Script>
  );
}
