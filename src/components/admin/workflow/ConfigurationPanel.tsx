import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAppConfig } from '@/hooks/useAppConfig';

interface ConfigField {
  key: string;
  label: string;
  type: 'number' | 'boolean' | 'string';
  description?: string;
}

const workflowFields: ConfigField[] = [
  { key: 'workflow.retry.max_attempts', label: 'Max Retry Attempts', type: 'number', description: 'Maximum times to retry a failed step' },
  { key: 'workflow.retry.base_delay_ms', label: 'Base Retry Delay (ms)', type: 'number', description: 'Initial delay for exponential backoff' },
  { key: 'workflow.retry.max_delay_ms', label: 'Max Retry Delay (ms)', type: 'number', description: 'Maximum delay between retries' },
  { key: 'workflow.dead_letter.auto_move_after', label: 'Dead Letter After', type: 'number', description: 'Move to dead letter after N failures' },
  { key: 'workflow.signal.timeout_ms', label: 'Signal Timeout (ms)', type: 'number', description: 'How long to wait for signals' },
  { key: 'workflow.compensation.enabled', label: 'Auto Compensation', type: 'boolean', description: 'Automatically run compensations on failure' },
];

const bookingFields: ConfigField[] = [
  { key: 'booking.deposit.percentage', label: 'Deposit %', type: 'number', description: 'Default deposit percentage' },
  { key: 'booking.confirmation.auto_send', label: 'Auto Send Confirmation', type: 'boolean', description: 'Automatically send confirmation emails' },
  { key: 'booking.reminder.hours_before', label: 'Reminder Hours', type: 'number', description: 'Send reminder N hours before' },
];

export function ConfigurationPanel() {
  const { config, loading, getValue, setValue, reload } = useAppConfig();
  const [saving, setSaving] = useState<string | null>(null);

  const handleSave = async (key: string, value: any) => {
    setSaving(key);
    const success = await setValue(key, value);
    if (success) {
      toast.success('Configuration saved');
    } else {
      toast.error('Failed to save');
    }
    setSaving(null);
  };

  const renderField = (field: ConfigField) => {
    const rawValue = getValue<any>(field.key, field.type === 'boolean' ? false : '');

    if (field.type === 'boolean') {
      const boolValue = rawValue === true || rawValue === 'true';
      return (
        <div key={field.key} className="flex items-center justify-between py-3 border-b last:border-0">
          <div className="flex-1">
            <Label className="font-medium">{field.label}</Label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
          <Switch
            checked={boolValue}
            onCheckedChange={(checked) => handleSave(field.key, checked)}
            disabled={saving === field.key}
          />
        </div>
      );
    }

    const stringValue = String(rawValue ?? '');
    return (
      <div key={field.key} className="py-3 border-b last:border-0">
        <Label className="font-medium">{field.label}</Label>
        {field.description && (
          <p className="text-xs text-muted-foreground mb-2">{field.description}</p>
        )}
        <div className="flex gap-2">
          <Input
            type={field.type === 'number' ? 'number' : 'text'}
            defaultValue={stringValue}
            className="flex-1"
            onBlur={(e) => {
              const newValue = field.type === 'number' 
                ? Number(e.target.value) 
                : e.target.value;
              if (String(newValue) !== stringValue) {
                handleSave(field.key, newValue);
              }
            }}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading configuration...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>System Configuration</CardTitle>
        <Button variant="outline" size="sm" onClick={reload}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="workflow">
          <TabsList className="mb-4">
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="booking">Booking</TabsTrigger>
          </TabsList>

          <TabsContent value="workflow">
            <div className="space-y-1">
              {workflowFields.map(renderField)}
            </div>
          </TabsContent>

          <TabsContent value="booking">
            <div className="space-y-1">
              {bookingFields.map(renderField)}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
