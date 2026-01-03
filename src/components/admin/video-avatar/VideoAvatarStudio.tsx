import React, { useState, forwardRef } from "react";
import { 
  LayoutDashboard, 
  Video, 
  Users, 
  Mic2, 
  Settings,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import CreateVideoPanel from "./CreateVideoPanel";
import MyAvatarsPanel from "./MyAvatarsPanel";
import VoiceClonesPanel from "./VoiceClonesPanel";
import DashboardPanel from "./DashboardPanel";
import SettingsPanel from "./SettingsPanel";

type Tab = "dashboard" | "create" | "avatars" | "voices" | "settings";

interface NavItem {
  id: Tab;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: "create", label: "Create Video", icon: <Video className="w-5 h-5" /> },
  { id: "avatars", label: "My Avatars", icon: <Users className="w-5 h-5" /> },
  { id: "voices", label: "Voice Clones", icon: <Mic2 className="w-5 h-5" /> },
  { id: "settings", label: "Settings", icon: <Settings className="w-5 h-5" /> },
];

const VideoAvatarStudio = forwardRef<HTMLDivElement>((_, ref) => {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardPanel onNavigate={setActiveTab} />;
      case "create":
        return <CreateVideoPanel />;
      case "avatars":
        return <MyAvatarsPanel />;
      case "voices":
        return <VoiceClonesPanel />;
      case "settings":
        return <SettingsPanel />;
      default:
        return <DashboardPanel onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-120px)] bg-ink-black rounded-lg overflow-hidden border border-border/30">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-iron-dark border-r border-border/30 flex flex-col">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-needle-blue to-needle-blue/50 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-gothic text-lg text-foreground tracking-wide">
                Avatar Studio
              </h2>
              <p className="text-xs text-muted-foreground">Video Generator</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200",
                activeTab === item.id
                  ? "bg-needle-blue/20 text-needle-blue border border-needle-blue/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {item.icon}
              <span className="font-body text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border/30">
          <div className="px-4 py-3 rounded-lg bg-gothic-gold/10 border border-gothic-gold/20">
            <p className="text-xs text-gothic-gold font-medium">Pro Tip</p>
            <p className="text-xs text-muted-foreground mt-1">
              Record 2+ minutes of audio for best voice clone quality.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-ink-black">
        {renderContent()}
      </main>
    </div>
  );
});

VideoAvatarStudio.displayName = "VideoAvatarStudio";

export default VideoAvatarStudio;
