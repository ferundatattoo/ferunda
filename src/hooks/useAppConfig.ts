import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AppConfig {
  [key: string]: any;
}

export function useAppConfig(category?: string) {
  const [config, setConfig] = useState<AppConfig>({});
  const [loading, setLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    const query = supabase
      .from('app_configurations')
      .select('config_key, config_value');
    
    if (category) {
      query.eq('category', category);
    }

    const { data, error } = await query;
    
    if (!error && data) {
      const configMap: AppConfig = {};
      data.forEach(item => {
        configMap[item.config_key] = item.config_value;
      });
      setConfig(configMap);
    }
    setLoading(false);
  }, [category]);

  useEffect(() => {
    loadConfig();

    const channel = supabase
      .channel('config-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'app_configurations' 
      }, () => {
        loadConfig();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConfig]);

  const getValue = useCallback(<T = any>(key: string, defaultValue?: T): T => {
    const value = config[key];
    if (value === undefined) return defaultValue as T;
    
    // Parse JSON values
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    }
    return value as T;
  }, [config]);

  const setValue = useCallback(async (key: string, value: any) => {
    const { error } = await supabase
      .from('app_configurations')
      .upsert({ 
        config_key: key, 
        config_value: JSON.stringify(value),
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'config_key,workspace_id' 
      });
    
    if (!error) {
      setConfig(prev => ({ ...prev, [key]: value }));
    }
    return !error;
  }, []);

  return { config, loading, getValue, setValue, reload: loadConfig };
}

// Utility to get config in edge functions
export async function getConfigValue(key: string, defaultValue?: any) {
  const { data } = await supabase
    .from('app_configurations')
    .select('config_value')
    .eq('config_key', key)
    .single();
  
  if (!data) return defaultValue;
  
  try {
    return JSON.parse(data.config_value as string);
  } catch {
    return data.config_value;
  }
}
