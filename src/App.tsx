import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Seats from "./pages/Seats";
import Hardware from "./pages/Hardware";
import Licenses from "./pages/Licenses";
import Accounts from "./pages/Accounts";
import NewHires from "./pages/NewHires";
import Maintenance from "./pages/Maintenance";
import Security from "./pages/Security";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/seats" element={<Seats />} />
          <Route path="/hardware" element={<Hardware />} />
          <Route path="/licenses" element={<Licenses />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/new-hires" element={<NewHires />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/security" element={<Security />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
