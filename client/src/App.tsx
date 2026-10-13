import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import Home from "@/pages/home";
import Projects from "@/pages/projects";
import Support from "@/pages/support";
import Documentation from "@/pages/documentation";
import Contact from "@/pages/contact";
import PurchaseSuccess from "@/pages/purchase-success";
import NotFound from "@/pages/not-found";
import LicenseGate from "@/features/license/LicenseGate";

function GatedRouter() {
  return (
    <LicenseGate>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/projects" component={Projects} />
        <Route path="/support" component={Support} />
        <Route path="/documentation" component={Documentation} />
        <Route path="/contact" component={Contact} />
        <Route component={NotFound} />
      </Switch>
    </LicenseGate>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Switch>
            {/* Purchase success page is public — no license required */}
            <Route path="/purchase-success" component={PurchaseSuccess} />
            <Route component={GatedRouter} />
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
