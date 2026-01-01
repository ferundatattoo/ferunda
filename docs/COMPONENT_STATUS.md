# Ferunda Component Status

> Last updated: 2026-01-01

## Legend
- ✅ **Active** - Fully functional and in use
- 🔶 **Partial** - Implemented but missing connections or features
- ⚠️ **Deprecated** - Replaced by newer component
- 🔴 **Bug** - Has known issues

---

## Frontend Components

### Chat & Concierge
| Component | Status | Notes |
|-----------|--------|-------|
| `UnifiedConcierge.tsx` | ✅ Active | Main chat interface, supports Luna (FAQ) + Concierge (booking) modes |
| `ChatAssistant.tsx` | ⚠️ Deprecated | Replaced by UnifiedConcierge. Keep for reference only |
| `StudioConcierge.tsx` | ⚠️ Deprecated | Replaced by UnifiedConcierge |
| `ConciergeEntry.tsx` | ✅ Active | Entry point for chat flow |
| `ConciergeARPreview.tsx` | ✅ Active | Full AR preview for tattoo placement |
| `ARQuickPreview.tsx` | ✅ Active | Quick AR preview variant |

### Admin Components
| Component | Status | Notes |
|-----------|--------|-------|
| `UnifiedDashboard.tsx` | ✅ Active | Main admin dashboard |
| `GalleryManager.tsx` | ✅ Active | Portfolio management with AI vectorization |
| `BookingsManager.tsx` | ✅ Active | Booking management |
| `InboxUnified.tsx` | ✅ Active | Unified inbox with omnichannel setup |
| `SettingsHub.tsx` | ✅ Active | Settings management |
| `CalendarHub.tsx` | ✅ Active | Calendar management |
| `HealingGuardianAI.tsx` | ✅ Active | AI-powered healing tracking |
| `VideoAvatarStudio/` | 🔶 Partial | Video avatar generation - needs API keys |

### Customer Portal
| Component | Status | Notes |
|-----------|--------|-------|
| `CustomerPortal.tsx` | ✅ Active | Customer-facing portal |
| `ReferenceAnalyzerAI.tsx` | ✅ Active | AI reference image analysis |
| `ViabilitySimulator3D.tsx` | 🔶 Partial | 3D viability simulation - needs testing |
| `HealingGuardianTab.tsx` | ✅ Active | Customer healing tracking |

### Marketing
| Component | Status | Notes |
|-----------|--------|-------|
| `MarketingPortal.tsx` | ✅ Active | Marketing dashboard |
| `MarketingWizard.tsx` | ✅ Active | Marketing automation wizard |
| `AIMarketingLab.tsx` | 🔶 Partial | AI marketing tools |
| `TrendSpotterAI.tsx` | 🔶 Partial | Social trend analysis |

---

## Services

| Service | Status | Notes |
|---------|--------|-------|
| `DesignEngineInternal.ts` | ✅ Active | AI design pipeline - analyze, match, generate |

---

## Edge Functions

### Active & Tested
| Function | Status | Notes |
|----------|--------|-------|
| `chat-assistant` | ✅ Active | Luna FAQ assistant |
| `studio-concierge` | ✅ Active | Booking concierge AI |
| `create-booking` | ✅ Active | Booking creation |
| `booking-notification` | ✅ Active | Email notifications |
| `analyze-reference` | ✅ Active | Reference image analysis |

### Partial / Needs Testing
| Function | Status | Notes |
|----------|--------|-------|
| `sketch-gen-studio` | 🔶 Partial | Sketch generation - needs HuggingFace key |
| `ar-tattoo-engine` | 🔶 Partial | AR preview processing |
| `ferunda-agent` | 🔶 Partial | Agent orchestration |
| `viability-3d-simulator` | 🔶 Partial | 3D simulation |
| `generate-avatar-video` | 🔶 Partial | Video avatar - needs Synthesia key |

### Inactive
| Function | Status | Notes |
|----------|--------|-------|
| `tattoo-extractor` | 🔴 Inactive | SAM integration incomplete |
| `tiktok-upload` | 🔴 Inactive | TikTok API not connected |
| `tiktok-webhook` | 🔴 Inactive | TikTok API not connected |

---

## Database Tables

### Actively Used
- `bookings` - Core booking data
- `chat_conversations` - Chat sessions
- `chat_messages` - Message history
- `gallery_images` - Portfolio images
- `workspace_settings` - Workspace config
- `studio_artists` - Artist profiles

### Partially Used
- `ai_design_suggestions` - Stores generated designs
- `artist_portfolio_embeddings` - Vectorized portfolio
- `ar_preview_sessions` - AR session data (newly created)
- `healing_photos` - Healing tracking

### Empty / Unused
- `agent_decisions_log` - Agent learning
- `agent_learning_data` - ML training data
- `agent_self_reflections` - Agent improvements
- `booking_waitlist` - Waitlist feature
- `avatar_video_analytics` - Video analytics

---

## Known Issues

1. ~~**HealingGuardianAI**: Uses wrong column names (`client_name` instead of `name`)~~ ✅ Fixed
2. ~~**UnifiedDashboard**: Uses wrong column names~~ ✅ Fixed
3. ~~**ar_preview_sessions table**: Missing~~ ✅ Created
4. ~~**Badge component**: Missing forwardRef~~ ✅ Fixed

---

## Recommended Next Steps

1. **Add API Keys**: HuggingFace for sketch generation, Synthesia for video avatars
2. **Test AR Flow**: End-to-end AR preview with generated sketches
3. **Populate Embeddings**: Run portfolio vectorization on existing images
4. **Enable Waitlist**: Connect waitlist UI to booking_waitlist table
