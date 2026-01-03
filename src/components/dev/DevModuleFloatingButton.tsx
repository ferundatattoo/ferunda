import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Settings2 } from "lucide-react";
import { DevModulePanel } from "./DevModulePanel";

export function DevModuleFloatingButton() {
  const [open, setOpen] = useState(false);

  // Show in dev mode, Lovable preview, or when devMode is enabled
  const isDevMode = 
    import.meta.env.DEV || 
    window.location.search.includes('dev=true') ||
    window.location.hostname.includes('lovableproject.com') ||
    localStorage.getItem('devMode') === 'true';

  if (!isDevMode) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full border-amber-500/50 bg-background/80 backdrop-blur-sm shadow-lg hover:bg-amber-500/10 hover:border-amber-500"
        >
          <Settings2 className="h-5 w-5 text-amber-500" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-amber-500 flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Developer Module Control
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <DevModulePanel />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default DevModuleFloatingButton;
