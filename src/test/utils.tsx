import React, { type ReactElement } from "react";
import { render } from "@testing-library/react";

// Lightweight test utils for component rendering
export function renderUI(ui: ReactElement) {
  return render(ui);
}

