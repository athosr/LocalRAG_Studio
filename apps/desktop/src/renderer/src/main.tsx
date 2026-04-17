import React from "react";
import ReactDOM from "react-dom/client";
import { LocalragApiProvider } from "./api/LocalragApiContext.js";
import { App } from "./App.js";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LocalragApiProvider value={window.localrag}>
      <App />
    </LocalragApiProvider>
  </React.StrictMode>,
);
