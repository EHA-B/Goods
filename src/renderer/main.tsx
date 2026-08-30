import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";

import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";

// Prevent mouse-wheel/trackpad scrolling from changing numeric input values.
// Numeric fields remain editable from the keyboard only.
const preventNumberInputWheel = (event: WheelEvent) => {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.type === "number") {
    event.preventDefault();
  }
};

document.addEventListener("wheel", preventNumberInputWheel, {
  capture: true,
  passive: false,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);