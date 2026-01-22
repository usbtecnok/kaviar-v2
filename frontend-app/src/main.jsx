import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, GlobalStyles } from "@mui/material";
import { kaviarTheme, globalAnimationStyles } from "./styles/theme-premium.js";
import { AuthProvider } from "./auth/AuthContext.jsx";
import App from "./App.jsx";

// Debug: verificar API_BASE_URL em produção
console.log('[KAVIAR] API_BASE_URL:', import.meta.env.VITE_API_BASE_URL || 'NOT SET');
console.log('[KAVIAR] MODE:', import.meta.env.MODE);

const root = document.getElementById("root");

createRoot(root).render(
  <BrowserRouter>
    <ThemeProvider theme={kaviarTheme}>
      <CssBaseline />
      <GlobalStyles styles={globalAnimationStyles} />
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);
