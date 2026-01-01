import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  ThumbsUp, 
  ThumbsDown, 
  Minus,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ZoomIn
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface VariantScores {
  styleAlignment: number;
  clarity: number;
  uniqueness: number;
  arFitness: number;
}

interface ConceptVariant {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  scores: VariantScores;
  selected?: boolean;
}

interface VariantSelectorProps {
  variants: ConceptVariant[];
  onSelect: (variantId: string) => void;
  onFeedback: (variantId: string, reaction: 'like' | 'dislike' | 'neutral') => void;
  onConfirm: () => void;
  isLoading?: boolean;
  selectedId?: string;
}

export function VariantSelector({
  variants,
  onSelect,
  onFeedback,
  onConfirm,
  isLoading = false,
  selectedId
}: VariantSelectorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomedVariant, setZoomedVariant] = useState<ConceptVariant | null>(null);
  const [feedback, setFeedback] = useState<Record<string, 'like' | 'dislike' | 'neutral'>>({});
  
  const currentVariant = variants[currentIndex];
  
  const handleFeedback = (reaction: 'like' | 'dislike' | 'neutral') => {
    if (!currentVariant) return;
    setFeedback(prev => ({ ...prev, [currentVariant.id]: reaction }));
    onFeedback(currentVariant.id, reaction);
    
    // Auto-advance on feedback
    if (currentIndex < variants.length - 1) {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 300);
    }
  };
  
  const handleSelect = () => {
    if (!currentVariant) return;
    onSelect(currentVariant.id);
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-500';
    if (score >= 0.6) return 'text-amber-500';
    return 'text-red-500';
  };
  
  const getOverallScore = (scores: VariantScores) => {
    return (scores.styleAlignment + scores.clarity + scores.uniqueness + scores.arFitness) / 4;
  };
  
  if (variants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Sparkles className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">
          No variants generated yet
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Main Variant Display */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentVariant.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="relative rounded-lg overflow-hidden bg-secondary/30"
          >
            {/* Image */}
            <div 
              className="aspect-square relative cursor-pointer group"
              onClick={() => setZoomedVariant(currentVariant)}
            >
              <img
                src={currentVariant.imageUrl}
                alt={`Concept ${currentIndex + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              {/* Selection indicator */}
              {selectedId === currentVariant.id && (
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}
              
              {/* Feedback indicator */}
              {feedback[currentVariant.id] && (
                <div className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center ${
                  feedback[currentVariant.id] === 'like' ? 'bg-green-500' :
                  feedback[currentVariant.id] === 'dislike' ? 'bg-red-500' :
                  'bg-gray-500'
                }`}>
                  {feedback[currentVariant.id] === 'like' && <ThumbsUp className="w-4 h-4 text-white" />}
                  {feedback[currentVariant.id] === 'dislike' && <ThumbsDown className="w-4 h-4 text-white" />}
                  {feedback[currentVariant.id] === 'neutral' && <Minus className="w-4 h-4 text-white" />}
                </div>
              )}
            </div>
            
            {/* Scores */}
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Concept {currentIndex + 1} of {variants.length}
                </span>
                <Badge variant="secondary" className={getScoreColor(getOverallScore(currentVariant.scores))}>
                  {Math.round(getOverallScore(currentVariant.scores) * 100)}% Match
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">Style</span>
                    <span className={getScoreColor(currentVariant.scores.styleAlignment)}>
                      {Math.round(currentVariant.scores.styleAlignment * 100)}%
                    </span>
                  </div>
                  <Progress value={currentVariant.scores.styleAlignment * 100} className="h-1" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">Clarity</span>
                    <span className={getScoreColor(currentVariant.scores.clarity)}>
                      {Math.round(currentVariant.scores.clarity * 100)}%
                    </span>
                  </div>
                  <Progress value={currentVariant.scores.clarity * 100} className="h-1" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">Unique</span>
                    <span className={getScoreColor(currentVariant.scores.uniqueness)}>
                      {Math.round(currentVariant.scores.uniqueness * 100)}%
                    </span>
                  </div>
                  <Progress value={currentVariant.scores.uniqueness * 100} className="h-1" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">AR Ready</span>
                    <span className={getScoreColor(currentVariant.scores.arFitness)}>
                      {Math.round(currentVariant.scores.arFitness * 100)}%
                    </span>
                  </div>
                  <Progress value={currentVariant.scores.arFitness * 100} className="h-1" />
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        
        {/* Navigation Arrows */}
        {variants.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex(prev => (prev - 1 + variants.length) % variants.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentIndex(prev => (prev + 1) % variants.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
      
      {/* Thumbnail Strip */}
      {variants.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {variants.map((variant, i) => (
            <button
              key={variant.id}
              onClick={() => setCurrentIndex(i)}
              className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                i === currentIndex 
                  ? 'border-primary' 
                  : selectedId === variant.id 
                    ? 'border-green-500' 
                    : 'border-transparent'
              }`}
            >
              <img
                src={variant.thumbnailUrl || variant.imageUrl}
                alt={`Variant ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {feedback[variant.id] && (
                <div className={`absolute inset-0 flex items-center justify-center ${
                  feedback[variant.id] === 'like' ? 'bg-green-500/30' :
                  feedback[variant.id] === 'dislike' ? 'bg-red-500/30' :
                  'bg-gray-500/30'
                }`}>
                  {feedback[variant.id] === 'like' && <ThumbsUp className="w-4 h-4 text-white" />}
                  {feedback[variant.id] === 'dislike' && <ThumbsDown className="w-4 h-4 text-white" />}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-2">
        {/* Feedback buttons */}
        <div className="flex gap-1">
          <Button
            variant={feedback[currentVariant.id] === 'dislike' ? 'destructive' : 'outline'}
            size="icon"
            onClick={() => handleFeedback('dislike')}
          >
            <ThumbsDown className="w-4 h-4" />
          </Button>
          <Button
            variant={feedback[currentVariant.id] === 'neutral' ? 'secondary' : 'outline'}
            size="icon"
            onClick={() => handleFeedback('neutral')}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Button
            variant={feedback[currentVariant.id] === 'like' ? 'default' : 'outline'}
            size="icon"
            onClick={() => handleFeedback('like')}
            className={feedback[currentVariant.id] === 'like' ? 'bg-green-500 hover:bg-green-600' : ''}
          >
            <ThumbsUp className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex-1" />
        
        {/* Select & Confirm */}
        {selectedId !== currentVariant.id ? (
          <Button onClick={handleSelect} variant="outline">
            Select This
          </Button>
        ) : (
          <Button 
            onClick={onConfirm} 
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Finalize Design
          </Button>
        )}
      </div>
      
      {/* Zoom Dialog */}
      <Dialog open={!!zoomedVariant} onOpenChange={() => setZoomedVariant(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {zoomedVariant && (
            <img
              src={zoomedVariant.imageUrl}
              alt="Zoomed concept"
              className="w-full h-auto"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default VariantSelector;
