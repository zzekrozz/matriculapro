import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function saveAuthoritativeFreeVehicleCheck(input: {
  userId: string;
  title: string;
  inputSnapshot: Record<string, unknown>;
  resultSnapshot: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high' | 'blocked';
  ruleVersion: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  if (!UUID_PATTERN.test(input.userId)) throw new Error('Invalid free-check user');
  if (!input.ruleVersion.trim()) throw new Error('Missing free-check rule version');
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from('free_vehicle_checks').insert({
    user_id: input.userId,
    title: input.title.slice(0, 160),
    input_snapshot: input.inputSnapshot,
    result_snapshot: input.resultSnapshot,
    risk_level: input.riskLevel,
    rule_version: input.ruleVersion,
    metadata: input.metadata ?? {},
  }).select('id').single();
  if (error || !data?.id) {
    throw new Error(`Could not persist authoritative free check: ${error?.message ?? 'missing_id'}`);
  }
  return String(data.id);
}

