import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Operations from "@/pages/Operations";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  return <DashboardLayout><Switch><Route path="/" component={Home} /><Route path="/applications"><Operations section="applications" /></Route><Route path="/collections"><Operations section="collections" /></Route><Route path="/compliance"><Operations section="compliance" /></Route><Route path="/reports"><Operations section="reports" /></Route><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch></DashboardLayout>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
