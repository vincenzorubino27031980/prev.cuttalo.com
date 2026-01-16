'use client';

import Script from 'next/script';

export default function GateLoader() {
  return (
    <Script
      src="https://back.cuttalo.com/gate-loader.js"
      strategy="beforeInteractive"
    />
  );
}
