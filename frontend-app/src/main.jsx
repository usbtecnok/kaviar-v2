import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, GlobalStyles } from "@mui/material";
import { kaviarTheme, globalAnimationStyles } from "./styles/theme-premium.js";
import App from "./App.jsx";

const root = document.getElementById("root");

createRoot(root).render(
  <BrowserRouter>
    <ThemeProvider theme={kaviarTheme}>
      <CssBaseline />
      <GlobalStyles styles={globalAnimationStyles} />
      <App />
    </ThemeProvider>
  </BrowserRouter>
);
