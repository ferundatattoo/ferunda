import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Palette, 
  MapPin, 
  Ruler, 
  Clock, 
  Sparkles, 
  Check, 
  AlertCircle,
  Edit3,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export interface TattooBrief {
  id?: string;
  style?: string;
  style_confidence?: number;
  subject?: string;
  mood_keywords?: string[];
  placement?: string;
  placement_photo_url?: string;
  size_estimate_inches_min?: number;
  size_estimate_inches_max?: number;
  color_type?: 'black_grey' | 'color' | 'mixed' | 'undecided';
  session_estimate_hours_min?: number;
  session_estimate_hours_max?: number;
  estimated_sessions_needed?: number;
  constraints?: {
    is_coverup?: boolean;
    has_scarring?: boolean;
    budget_min?: number;
    budget_max?: number;
    deadline?: string;
    first_tattoo?: boolean;
  };
  missing_info?: string[];
  fit_score?: number;
  fit_reasoning?: string;
  status?: 'draft' | 'ready' | 'approved' | 'in_progress' | 'completed';
  reference_image_urls?: string[];
}

interface TattooBriefCardProps {
  brief: TattooBrief;
  onEdit?: () => void;
  onApprove?: () => void;
  isEditable?: boolean;
  compact?: boolean;
}

const colorTypeLabels: Record<string, string> = {
  black_grey: "Black & Grey",
  color: "Color",
  mixed: "Mixed",
  undecided: "Undecided"
};

const statusConfig = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
  ready: { label: "Ready", color: "bg-primary/20 text-primary" },
  approved: { label: "Approved", color: "bg-green-500/20 text-green-400" },
  in_progress: { label: "In Progress", color: "bg-amber-500/20 text-amber-400" },
  completed: { label: "Completed", color: "bg-emerald-500/20 text-emerald-400" }
};

export function TattooBriefCard({ 
  brief, 
  onEdit, 
  onApprove, 
  isEditable = false,
  compact = false 
}: TattooBriefCardProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [animateFields, setAnimateFields] = useState<string[]>([]);
  
  // Calculate completeness
  const requiredFields = ['style', 'placement', 'size_estimate_inches_min', 'color_type'];
  const filledFields = requiredFields.filter(field => {
    const value = brief[field as keyof TattooBrief];
    return value !== undefined && value !== null && value !== '';
  });
  const completeness = Math.round((filledFields.length / requiredFields.length) * 100);
  
  // Animate newly added fields
  useEffect(() => {
    const newFields: string[] = [];
    if (brief.style) newFields.push('style');
    if (brief.placement) newFields.push('placement');
    if (brief.size_estimate_inches_min) newFields.push('size');
    if (brief.color_type) newFields.push('color');
    
    setAnimateFields(newFields);
    const timer = setTimeout(() => setAnimateFields([]), 500);
    return () => clearTimeout(timer);
  }, [brief.style, brief.placement, brief.size_estimate_inches_min, brief.color_type]);
  
  const formatSize = () => {
    if (!brief.size_estimate_inches_min) return null;
    if (brief.size_estimate_inches_max && brief.size_estimate_inches_max !== brief.size_estimate_inches_min) {
      return `${brief.size_estimate_inches_min}–${brief.size_estimate_inches_max}"`;
    }
    return `~${brief.size_estimate_inches_min}"`;
  };
  
  const formatDuration = () => {
    if (!brief.session_estimate_hours_min) return null;
    if (brief.session_estimate_hours_max && brief.session_estimate_hours_max !== brief.session_estimate_hours_min) {
      return `${brief.session_estimate_hours_min}–${brief.session_estimate_hours_max} hours`;
    }
    return `~${brief.session_estimate_hours_min} hours`;
  };
  
  const status = brief.status || 'draft';
  const statusInfo = statusConfig[status];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div 
        className={`p-4 border-b border-border/30 flex items-center justify-between ${compact ? 'cursor-pointer' : ''}`}
        onClick={() => compact && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Your Tattoo Plan</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={`text-xs ${statusInfo.color}`}>
                {statusInfo.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {completeness}% complete
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isEditable && onEdit && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          )}
          {compact && (
            <Button variant="ghost" size="sm">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="px-4 py-2 bg-muted/30">
        <Progress value={completeness} className="h-1.5" />
      </div>
      
      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 space-y-4">
              {/* Style */}
              <BriefField
                icon={<Palette className="w-4 h-4" />}
                label="Style"
                value={brief.style}
                confidence={brief.style_confidence}
                isAnimating={animateFields.includes('style')}
              />
              
              {/* Subject */}
              {brief.subject && (
                <BriefField
                  icon={<Sparkles className="w-4 h-4" />}
                  label="Subject"
                  value={brief.subject}
                />
              )}
              
              {/* Placement */}
              <BriefField
                icon={<MapPin className="w-4 h-4" />}
                label="Placement"
                value={brief.placement}
                isAnimating={animateFields.includes('placement')}
              />
              
              {/* Size */}
              <BriefField
                icon={<Ruler className="w-4 h-4" />}
                label="Size"
                value={formatSize()}
                isAnimating={animateFields.includes('size')}
              />
              
              {/* Color */}
              {brief.color_type && (
                <BriefField
                  icon={<div className={`w-4 h-4 rounded-full ${
                    brief.color_type === 'black_grey' ? 'bg-gradient-to-r from-gray-800 to-gray-400' :
                    brief.color_type === 'color' ? 'bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-500' :
                    'bg-gradient-to-r from-gray-600 to-purple-400'
                  }`} />}
                  label="Color"
                  value={colorTypeLabels[brief.color_type]}
                  isAnimating={animateFields.includes('color')}
                />
              )}
              
              {/* Duration */}
              {formatDuration() && (
                <BriefField
                  icon={<Clock className="w-4 h-4" />}
                  label="Session"
                  value={formatDuration()}
                />
              )}
              
              {/* Mood keywords */}
              {brief.mood_keywords && brief.mood_keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {brief.mood_keywords.map((keyword, i) => (
                    <Badge 
                      key={i} 
                      variant="secondary" 
                      className="text-xs bg-primary/10 text-primary border-primary/20"
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Constraints */}
              {brief.constraints && Object.keys(brief.constraints).length > 0 && (
                <div className="pt-2 border-t border-border/30">
                  <p className="text-xs text-muted-foreground mb-2">Notes:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {brief.constraints.first_tattoo && (
                      <Badge variant="outline" className="text-xs">First tattoo</Badge>
                    )}
                    {brief.constraints.is_coverup && (
                      <Badge variant="outline" className="text-xs">Cover-up</Badge>
                    )}
                    {brief.constraints.has_scarring && (
                      <Badge variant="outline" className="text-xs">Scarring</Badge>
                    )}
                    {brief.constraints.budget_max && (
                      <Badge variant="outline" className="text-xs">
                        Budget: ${brief.constraints.budget_min || 0}–${brief.constraints.budget_max}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              {/* Fit score */}
              {brief.fit_score !== undefined && (
                <div className="pt-2 border-t border-border/30">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      brief.fit_score >= 80 ? 'bg-green-500/20 text-green-400' :
                      brief.fit_score >= 60 ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {brief.fit_score >= 80 ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {brief.fit_score >= 80 ? 'Great fit!' : brief.fit_score >= 60 ? 'Good fit' : 'Consult recommended'}
                      </p>
                      {brief.fit_reasoning && (
                        <p className="text-xs text-muted-foreground">{brief.fit_reasoning}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Missing info */}
              {brief.missing_info && brief.missing_info.length > 0 && (
                <div className="pt-2 border-t border-border/30">
                  <p className="text-xs text-muted-foreground mb-1">Still need:</p>
                  <p className="text-sm text-amber-400">
                    {brief.missing_info.join(', ')}
                  </p>
                </div>
              )}
              
              {/* Actions */}
              {status === 'ready' && onApprove && (
                <div className="pt-3">
                  <Button onClick={onApprove} className="w-full">
                    <Check className="w-4 h-4 mr-2" />
                    Looks right!
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface BriefFieldProps {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  confidence?: number;
  isAnimating?: boolean;
}

function BriefField({ icon, label, value, confidence, isAnimating }: BriefFieldProps) {
  if (!value) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground/50">
        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider">{label}</p>
          <p className="text-sm italic">Not set yet</p>
        </div>
      </div>
    );
  }
  
  return (
    <motion.div 
      className="flex items-center gap-3"
      animate={isAnimating ? { scale: [1, 1.02, 1], backgroundColor: ['transparent', 'hsl(var(--primary) / 0.1)', 'transparent'] } : {}}
      transition={{ duration: 0.3 }}
    >
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{value}</p>
          {confidence !== undefined && confidence > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {Math.round(confidence * 100)}%
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default TattooBriefCard;
