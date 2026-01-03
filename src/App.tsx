import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Seats from "./pages/Seats";
import ComingSoon from "./pages/ComingSoon";
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
          <Route path="/hardware" element={<ComingSoon title="Hardware Assets" description="Track workstations, headsets, monitors, and all physical assets with high-volume optimization." />} />
          <Route path="/licenses" element={<ComingSoon title="License Compliance" description="Software and license tracking built for client and ISO audits." />} />
          <Route path="/accounts" element={<ComingSoon title="Account Management" description="Manage client programs, required software stacks, and compliance checklists." />} />
          <Route path="/new-hires" element={<ComingSoon title="New Hire Readiness" description="Track hiring batches, seat provisioning, and onboarding status." />} />
          <Route path="/maintenance" element={<ComingSoon title="Maintenance & SLA" description="Downtime tracking, MTTR metrics, and incident history per asset." />} />
          <Route path="/security" element={<ComingSoon title="Security & Risk" description="Patch levels, encryption status, DLP compliance, and EOL alerts." />} />
          <Route path="/reports" element={<ComingSoon title="Audit & Reports" description="One-click reports for ISO 27001, SOC 2, PCI-DSS, and client audits." />} />
          <Route path="/settings" element={<ComingSoon title="Settings" description="System configuration, role-based access, and integrations." />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
