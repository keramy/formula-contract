"use client";

import { FormulaLoader } from "./formula-loader";

export function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <FormulaLoader />
    </div>
  );
}
