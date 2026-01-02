// =============================================================================
// CONFIRM DIALOG - Shared confirmation dialog component
// =============================================================================

import { memo, useState, useCallback, type ReactNode } from 'react';
import { AlertTriangle, Info, HelpCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: 'default' | 'destructive' | 'warning' | 'info';
  isLoading?: boolean;
  children?: ReactNode;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export const ConfirmDialog = memo(function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  isLoading = false,
  children,
}: ConfirmDialogProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'destructive':
        return <AlertTriangle className="w-6 h-6 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-500" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-500" />;
      default:
        return <HelpCircle className="w-6 h-6 text-muted-foreground" />;
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
            <div className="flex-1">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              {description && (
                <AlertDialogDescription asChild={typeof description !== 'string'}>
                  {typeof description === 'string' ? description : <div>{description}</div>}
                </AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>

        {children && <div className="py-4">{children}</div>}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={
              variant === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : ''
            }
          >
            {isLoading ? 'Loading...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

// -----------------------------------------------------------------------------
// Preset Dialogs
// -----------------------------------------------------------------------------

export interface RejectDesignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  designName?: string;
}

export const RejectDesignDialog = memo(function RejectDesignDialog({
  open,
  onOpenChange,
  onConfirm,
  designName = 'this design',
}: RejectDesignDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Reject ${designName}?`}
      description="This will remove the sketch from your options. You can always generate new designs later."
      confirmLabel="Reject"
      cancelLabel="Keep it"
      onConfirm={onConfirm}
      variant="warning"
    />
  );
});

export interface CloseSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  hasUnsavedChanges?: boolean;
}

export const CloseSessionDialog = memo(function CloseSessionDialog({
  open,
  onOpenChange,
  onConfirm,
  hasUnsavedChanges = false,
}: CloseSessionDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Close session?"
      description={
        hasUnsavedChanges
          ? 'You have unsaved changes. Are you sure you want to close? Your progress will be lost.'
          : 'Are you sure you want to close this session?'
      }
      confirmLabel="Close"
      cancelLabel="Stay"
      onConfirm={onConfirm}
      variant={hasUnsavedChanges ? 'warning' : 'default'}
    />
  );
});

export interface SubmitBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  depositAmount?: string;
  isLoading?: boolean;
}

export const SubmitBookingDialog = memo(function SubmitBookingDialog({
  open,
  onOpenChange,
  onConfirm,
  depositAmount = '$50',
  isLoading = false,
}: SubmitBookingDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm booking request"
      description={
        <div className="space-y-2">
          <p>You're about to submit your booking request.</p>
          {depositAmount && (
            <p className="text-sm text-muted-foreground">
              A deposit of <strong className="text-foreground">{depositAmount}</strong> will be
              required to secure your appointment.
            </p>
          )}
        </div>
      }
      confirmLabel="Submit Request"
      cancelLabel="Review Details"
      onConfirm={onConfirm}
      isLoading={isLoading}
      variant="info"
    />
  );
});

// -----------------------------------------------------------------------------
// Simple confirmation hook
// -----------------------------------------------------------------------------

export interface UseConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogProps['variant'];
}

export function useConfirm(defaultOptions?: UseConfirmOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<UseConfirmOptions>(
    defaultOptions || { title: 'Confirm' }
  );
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback(
    (overrideOptions?: Partial<UseConfirmOptions>): Promise<boolean> => {
      setOptions((prev) => ({ ...prev, ...overrideOptions }));
      setIsOpen(true);

      return new Promise((resolve) => {
        setResolver(() => resolve);
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    resolver?.(true);
    setIsOpen(false);
    setResolver(null);
  }, [resolver]);

  const handleCancel = useCallback(() => {
    resolver?.(false);
    setIsOpen(false);
    setResolver(null);
  }, [resolver]);

  const ConfirmDialogComponent = useCallback(
    () => (
      <ConfirmDialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) handleCancel();
        }}
        title={options.title}
        description={options.description}
        confirmLabel={options.confirmLabel}
        cancelLabel={options.cancelLabel}
        variant={options.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ),
    [isOpen, options, handleConfirm, handleCancel]
  );

  return {
    confirm,
    ConfirmDialog: ConfirmDialogComponent,
    isOpen,
  };
}

// -----------------------------------------------------------------------------
// Export default
// -----------------------------------------------------------------------------

export default ConfirmDialog;
