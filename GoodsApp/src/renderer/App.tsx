import { Toaster } from "sonner";

import AppRouter from "./routes/AppRouter";

function App() {
  return (
    <>
      <AppRouter />

      <Toaster
        position="top-center"
        richColors
        closeButton
        dir="rtl"
      />
    </>
  );
}

export default App;