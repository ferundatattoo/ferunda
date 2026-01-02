// =============================================================================
// CONCIERGE CONTEXT - Centralized state management for concierge flow
// =============================================================================

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  type ReactNode,
  type Dispatch,
} from 'react';
import type {
  ConciergeSession,
  DesignBrief,
  ChatMessage,
  ConceptVariant,
  FeasibilityResult,
  PreGateResult,
  SessionStage,
  TattooTransform,
  ActionCard,
  UploadedImage,
} from '@/types/concierge';
import { DEFAULT_TRANSFORM } from '@/types/concierge';

// -----------------------------------------------------------------------------
// State Types
// -----------------------------------------------------------------------------

export interface ConciergeState {
  // Session
  session: ConciergeSession | null;
  isSessionLoading: boolean;
  sessionError: string | null;

  // Messages
  messages: ChatMessage[];
  isMessageLoading: boolean;

  // Design Brief
  designBrief: DesignBrief;

  // Pre-Gate
  preGateResult: PreGateResult | null;
  preGateCompleted: boolean;

  // AR Preview
  arTransform: TattooTransform;
  arIsOpen: boolean;
  arMode: 'quick' | 'tracking';

  // Co-Design / Variants
  variants: ConceptVariant[];
  selectedVariantId: string | null;
  isGeneratingVariants: boolean;

  // Feasibility
  feasibilityResult: FeasibilityResult | null;
  isFeasibilityChecking: boolean;

  // Image Uploads
  uploadedImages: UploadedImage[];
  uploadProgress: number;
  isCompressing: boolean;

  // UI State
  currentActionCards: ActionCard[];
  isOpen: boolean;
  currentStep: string;

  // Reference Data
  lastImageUrl: string | null;
  conversationId: string | null;
}

// -----------------------------------------------------------------------------
// Action Types
// -----------------------------------------------------------------------------

type ConciergeAction =
  // Session Actions
  | { type: 'SESSION_INIT_START' }
  | { type: 'SESSION_INIT_SUCCESS'; payload: ConciergeSession }
  | { type: 'SESSION_INIT_ERROR'; payload: string }
  | { type: 'SESSION_UPDATE'; payload: Partial<ConciergeSession> }
  | { type: 'SESSION_STAGE_CHANGE'; payload: SessionStage }

  // Message Actions
  | { type: 'MESSAGE_ADD'; payload: ChatMessage }
  | { type: 'MESSAGE_LOADING_START' }
  | { type: 'MESSAGE_LOADING_END' }
  | { type: 'MESSAGES_CLEAR' }

  // Design Brief Actions
  | { type: 'BRIEF_UPDATE'; payload: Partial<DesignBrief> }
  | { type: 'BRIEF_RESET' }

  // Pre-Gate Actions
  | { type: 'PREGATE_COMPLETE'; payload: PreGateResult }
  | { type: 'PREGATE_RESET' }

  // AR Actions
  | { type: 'AR_OPEN'; payload?: { mode?: 'quick' | 'tracking' } }
  | { type: 'AR_CLOSE' }
  | { type: 'AR_TRANSFORM_UPDATE'; payload: Partial<TattooTransform> }
  | { type: 'AR_TRANSFORM_RESET' }
  | { type: 'AR_MODE_SET'; payload: 'quick' | 'tracking' }

  // Variant Actions
  | { type: 'VARIANTS_SET'; payload: ConceptVariant[] }
  | { type: 'VARIANT_SELECT'; payload: string }
  | { type: 'VARIANTS_GENERATING_START' }
  | { type: 'VARIANTS_GENERATING_END' }
  | { type: 'VARIANTS_CLEAR' }

  // Feasibility Actions
  | { type: 'FEASIBILITY_CHECK_START' }
  | { type: 'FEASIBILITY_CHECK_SUCCESS'; payload: FeasibilityResult }
  | { type: 'FEASIBILITY_CHECK_ERROR' }
  | { type: 'FEASIBILITY_CLEAR' }

  // Upload Actions
  | { type: 'UPLOAD_ADD'; payload: UploadedImage }
  | { type: 'UPLOAD_REMOVE'; payload: number }
  | { type: 'UPLOAD_CLEAR' }
  | { type: 'UPLOAD_PROGRESS'; payload: number }
  | { type: 'UPLOAD_COMPRESSING_START' }
  | { type: 'UPLOAD_COMPRESSING_END' }

  // UI Actions
  | { type: 'UI_OPEN' }
  | { type: 'UI_CLOSE' }
  | { type: 'UI_STEP_SET'; payload: string }
  | { type: 'ACTION_CARDS_SET'; payload: ActionCard[] }

  // Reference Actions
  | { type: 'LAST_IMAGE_SET'; payload: string }
  | { type: 'CONVERSATION_ID_SET'; payload: string }

  // Global Reset
  | { type: 'RESET_ALL' };

// -----------------------------------------------------------------------------
// Initial State
// -----------------------------------------------------------------------------

const initialState: ConciergeState = {
  session: null,
  isSessionLoading: false,
  sessionError: null,

  messages: [],
  isMessageLoading: false,

  designBrief: {},

  preGateResult: null,
  preGateCompleted: false,

  arTransform: DEFAULT_TRANSFORM,
  arIsOpen: false,
  arMode: 'quick',

  variants: [],
  selectedVariantId: null,
  isGeneratingVariants: false,

  feasibilityResult: null,
  isFeasibilityChecking: false,

  uploadedImages: [],
  uploadProgress: 0,
  isCompressing: false,

  currentActionCards: [],
  isOpen: false,
  currentStep: 'type',

  lastImageUrl: null,
  conversationId: null,
};

// -----------------------------------------------------------------------------
// Reducer
// -----------------------------------------------------------------------------

function conciergeReducer(state: ConciergeState, action: ConciergeAction): ConciergeState {
  switch (action.type) {
    // Session
    case 'SESSION_INIT_START':
      return { ...state, isSessionLoading: true, sessionError: null };

    case 'SESSION_INIT_SUCCESS':
      return {
        ...state,
        session: action.payload,
        isSessionLoading: false,
        sessionError: null,
      };

    case 'SESSION_INIT_ERROR':
      return { ...state, isSessionLoading: false, sessionError: action.payload };

    case 'SESSION_UPDATE':
      return {
        ...state,
        session: state.session ? { ...state.session, ...action.payload } : null,
      };

    case 'SESSION_STAGE_CHANGE':
      return {
        ...state,
        session: state.session ? { ...state.session, stage: action.payload } : null,
      };

    // Messages
    case 'MESSAGE_ADD':
      return { ...state, messages: [...state.messages, action.payload] };

    case 'MESSAGE_LOADING_START':
      return { ...state, isMessageLoading: true };

    case 'MESSAGE_LOADING_END':
      return { ...state, isMessageLoading: false };

    case 'MESSAGES_CLEAR':
      return { ...state, messages: [] };

    // Design Brief
    case 'BRIEF_UPDATE':
      return { ...state, designBrief: { ...state.designBrief, ...action.payload } };

    case 'BRIEF_RESET':
      return { ...state, designBrief: {} };

    // Pre-Gate
    case 'PREGATE_COMPLETE':
      return { ...state, preGateResult: action.payload, preGateCompleted: true };

    case 'PREGATE_RESET':
      return { ...state, preGateResult: null, preGateCompleted: false };

    // AR
    case 'AR_OPEN':
      return {
        ...state,
        arIsOpen: true,
        arMode: action.payload?.mode || state.arMode,
      };

    case 'AR_CLOSE':
      return { ...state, arIsOpen: false };

    case 'AR_TRANSFORM_UPDATE':
      return { ...state, arTransform: { ...state.arTransform, ...action.payload } };

    case 'AR_TRANSFORM_RESET':
      return { ...state, arTransform: DEFAULT_TRANSFORM };

    case 'AR_MODE_SET':
      return { ...state, arMode: action.payload };

    // Variants
    case 'VARIANTS_SET':
      return { ...state, variants: action.payload, isGeneratingVariants: false };

    case 'VARIANT_SELECT':
      return { ...state, selectedVariantId: action.payload };

    case 'VARIANTS_GENERATING_START':
      return { ...state, isGeneratingVariants: true };

    case 'VARIANTS_GENERATING_END':
      return { ...state, isGeneratingVariants: false };

    case 'VARIANTS_CLEAR':
      return { ...state, variants: [], selectedVariantId: null };

    // Feasibility
    case 'FEASIBILITY_CHECK_START':
      return { ...state, isFeasibilityChecking: true };

    case 'FEASIBILITY_CHECK_SUCCESS':
      return { ...state, feasibilityResult: action.payload, isFeasibilityChecking: false };

    case 'FEASIBILITY_CHECK_ERROR':
      return { ...state, isFeasibilityChecking: false };

    case 'FEASIBILITY_CLEAR':
      return { ...state, feasibilityResult: null };

    // Uploads
    case 'UPLOAD_ADD':
      return { ...state, uploadedImages: [...state.uploadedImages, action.payload] };

    case 'UPLOAD_REMOVE': {
      const newImages = [...state.uploadedImages];
      // Revoke the object URL to prevent memory leak
      if (newImages[action.payload]) {
        URL.revokeObjectURL(newImages[action.payload].preview);
      }
      newImages.splice(action.payload, 1);
      return { ...state, uploadedImages: newImages };
    }

    case 'UPLOAD_CLEAR':
      // Revoke all object URLs
      state.uploadedImages.forEach((img) => URL.revokeObjectURL(img.preview));
      return { ...state, uploadedImages: [], uploadProgress: 0 };

    case 'UPLOAD_PROGRESS':
      return { ...state, uploadProgress: action.payload };

    case 'UPLOAD_COMPRESSING_START':
      return { ...state, isCompressing: true };

    case 'UPLOAD_COMPRESSING_END':
      return { ...state, isCompressing: false };

    // UI
    case 'UI_OPEN':
      return { ...state, isOpen: true };

    case 'UI_CLOSE':
      return { ...state, isOpen: false };

    case 'UI_STEP_SET':
      return { ...state, currentStep: action.payload };

    case 'ACTION_CARDS_SET':
      return { ...state, currentActionCards: action.payload };

    // Reference
    case 'LAST_IMAGE_SET':
      return { ...state, lastImageUrl: action.payload };

    case 'CONVERSATION_ID_SET':
      return { ...state, conversationId: action.payload };

    // Global Reset
    case 'RESET_ALL':
      // Clean up uploads before reset
      state.uploadedImages.forEach((img) => URL.revokeObjectURL(img.preview));
      return { ...initialState };

    default:
      return state;
  }
}

// -----------------------------------------------------------------------------
// Context Types
// -----------------------------------------------------------------------------

interface ConciergeContextType {
  state: ConciergeState;
  dispatch: Dispatch<ConciergeAction>;

  // Convenience actions
  actions: {
    // Session
    initSession: () => void;
    updateSession: (updates: Partial<ConciergeSession>) => void;

    // Messages
    addMessage: (message: ChatMessage) => void;
    setMessageLoading: (loading: boolean) => void;

    // Design Brief
    updateBrief: (updates: Partial<DesignBrief>) => void;
    resetBrief: () => void;

    // Pre-Gate
    completePreGate: (result: PreGateResult) => void;
    resetPreGate: () => void;

    // AR
    openAR: (mode?: 'quick' | 'tracking') => void;
    closeAR: () => void;
    updateARTransform: (updates: Partial<TattooTransform>) => void;
    resetARTransform: () => void;

    // Variants
    setVariants: (variants: ConceptVariant[]) => void;
    selectVariant: (id: string) => void;
    clearVariants: () => void;

    // Feasibility
    setFeasibilityResult: (result: FeasibilityResult) => void;
    clearFeasibility: () => void;

    // Uploads
    addUpload: (image: UploadedImage) => void;
    removeUpload: (index: number) => void;
    clearUploads: () => void;
    setUploadProgress: (progress: number) => void;

    // UI
    open: () => void;
    close: () => void;
    setStep: (step: string) => void;
    setActionCards: (cards: ActionCard[]) => void;

    // Reference
    setLastImage: (url: string) => void;
    setConversationId: (id: string) => void;

    // Global
    reset: () => void;
  };

  // Computed values
  computed: {
    isReady: boolean;
    readinessScore: number;
    canGenerateSketch: boolean;
    canBook: boolean;
    hasUploads: boolean;
    uploadCount: number;
  };
}

// -----------------------------------------------------------------------------
// Context Creation
// -----------------------------------------------------------------------------

const ConciergeContext = createContext<ConciergeContextType | null>(null);

// -----------------------------------------------------------------------------
// Provider Component
// -----------------------------------------------------------------------------

interface ConciergeProviderProps {
  children: ReactNode;
}

export function ConciergeProvider({ children }: ConciergeProviderProps) {
  const [state, dispatch] = useReducer(conciergeReducer, initialState);

  // Convenience actions
  const actions = useMemo(
    () => ({
      // Session
      initSession: () => dispatch({ type: 'SESSION_INIT_START' }),
      updateSession: (updates: Partial<ConciergeSession>) =>
        dispatch({ type: 'SESSION_UPDATE', payload: updates }),

      // Messages
      addMessage: (message: ChatMessage) => dispatch({ type: 'MESSAGE_ADD', payload: message }),
      setMessageLoading: (loading: boolean) =>
        dispatch({ type: loading ? 'MESSAGE_LOADING_START' : 'MESSAGE_LOADING_END' }),

      // Design Brief
      updateBrief: (updates: Partial<DesignBrief>) =>
        dispatch({ type: 'BRIEF_UPDATE', payload: updates }),
      resetBrief: () => dispatch({ type: 'BRIEF_RESET' }),

      // Pre-Gate
      completePreGate: (result: PreGateResult) =>
        dispatch({ type: 'PREGATE_COMPLETE', payload: result }),
      resetPreGate: () => dispatch({ type: 'PREGATE_RESET' }),

      // AR
      openAR: (mode?: 'quick' | 'tracking') => dispatch({ type: 'AR_OPEN', payload: { mode } }),
      closeAR: () => dispatch({ type: 'AR_CLOSE' }),
      updateARTransform: (updates: Partial<TattooTransform>) =>
        dispatch({ type: 'AR_TRANSFORM_UPDATE', payload: updates }),
      resetARTransform: () => dispatch({ type: 'AR_TRANSFORM_RESET' }),

      // Variants
      setVariants: (variants: ConceptVariant[]) =>
        dispatch({ type: 'VARIANTS_SET', payload: variants }),
      selectVariant: (id: string) => dispatch({ type: 'VARIANT_SELECT', payload: id }),
      clearVariants: () => dispatch({ type: 'VARIANTS_CLEAR' }),

      // Feasibility
      setFeasibilityResult: (result: FeasibilityResult) =>
        dispatch({ type: 'FEASIBILITY_CHECK_SUCCESS', payload: result }),
      clearFeasibility: () => dispatch({ type: 'FEASIBILITY_CLEAR' }),

      // Uploads
      addUpload: (image: UploadedImage) => dispatch({ type: 'UPLOAD_ADD', payload: image }),
      removeUpload: (index: number) => dispatch({ type: 'UPLOAD_REMOVE', payload: index }),
      clearUploads: () => dispatch({ type: 'UPLOAD_CLEAR' }),
      setUploadProgress: (progress: number) =>
        dispatch({ type: 'UPLOAD_PROGRESS', payload: progress }),

      // UI
      open: () => dispatch({ type: 'UI_OPEN' }),
      close: () => dispatch({ type: 'UI_CLOSE' }),
      setStep: (step: string) => dispatch({ type: 'UI_STEP_SET', payload: step }),
      setActionCards: (cards: ActionCard[]) =>
        dispatch({ type: 'ACTION_CARDS_SET', payload: cards }),

      // Reference
      setLastImage: (url: string) => dispatch({ type: 'LAST_IMAGE_SET', payload: url }),
      setConversationId: (id: string) => dispatch({ type: 'CONVERSATION_ID_SET', payload: id }),

      // Global
      reset: () => dispatch({ type: 'RESET_ALL' }),
    }),
    []
  );

  // Computed values
  const computed = useMemo(() => {
    const readinessScore = state.session?.readinessScore ?? 0;
    const isSleeve = state.designBrief.isSleeve ?? false;
    const threshold = isSleeve ? 0.85 : 0.75;

    return {
      isReady: readinessScore >= threshold,
      readinessScore,
      canGenerateSketch:
        readinessScore >= 0.5 &&
        !!state.designBrief.placementZone &&
        !!state.designBrief.sizeCategory,
      canBook:
        state.session?.stage === 'preview_ready' ||
        state.session?.stage === 'scheduling' ||
        state.session?.stage === 'deposit',
      hasUploads: state.uploadedImages.length > 0,
      uploadCount: state.uploadedImages.length,
    };
  }, [state.session, state.designBrief, state.uploadedImages]);

  const contextValue = useMemo(
    () => ({
      state,
      dispatch,
      actions,
      computed,
    }),
    [state, actions, computed]
  );

  return <ConciergeContext.Provider value={contextValue}>{children}</ConciergeContext.Provider>;
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export function useConcierge() {
  const context = useContext(ConciergeContext);

  if (!context) {
    throw new Error('useConcierge must be used within a ConciergeProvider');
  }

  return context;
}

// -----------------------------------------------------------------------------
// Selector Hooks (for performance optimization)
// -----------------------------------------------------------------------------

export function useConciergeSession() {
  const { state } = useConcierge();
  return {
    session: state.session,
    isLoading: state.isSessionLoading,
    error: state.sessionError,
  };
}

export function useConciergeMessages() {
  const { state, actions } = useConcierge();
  return {
    messages: state.messages,
    isLoading: state.isMessageLoading,
    addMessage: actions.addMessage,
    setLoading: actions.setMessageLoading,
  };
}

export function useConciergeAR() {
  const { state, actions } = useConcierge();
  return {
    isOpen: state.arIsOpen,
    mode: state.arMode,
    transform: state.arTransform,
    open: actions.openAR,
    close: actions.closeAR,
    updateTransform: actions.updateARTransform,
    resetTransform: actions.resetARTransform,
  };
}

export function useConciergeUploads() {
  const { state, actions } = useConcierge();
  return {
    images: state.uploadedImages,
    progress: state.uploadProgress,
    isCompressing: state.isCompressing,
    add: actions.addUpload,
    remove: actions.removeUpload,
    clear: actions.clearUploads,
    setProgress: actions.setUploadProgress,
  };
}

export function useConciergeVariants() {
  const { state, actions } = useConcierge();
  return {
    variants: state.variants,
    selectedId: state.selectedVariantId,
    isGenerating: state.isGeneratingVariants,
    set: actions.setVariants,
    select: actions.selectVariant,
    clear: actions.clearVariants,
  };
}

export default ConciergeContext;
