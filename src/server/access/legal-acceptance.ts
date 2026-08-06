import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VERSION_PATTERN = /^[A-Za-z0-9._-]{1,80}$/;

function validateIdentityAndVersions(userId: string, versions: readonly string[]): void {
  if (!UUID_PATTERN.test(userId)) throw new Error('Invalid acceptance user');
  if (versions.some((version) => !VERSION_PATTERN.test(version))) {
    throw new Error('Invalid legal document version');
  }
}

export async function recordRegistrationLegalAcceptances(input: {
  userId: string;
  termsVersion: string;
  privacyVersion: string;
}): Promise<void> {
  validateIdentityAndVersions(input.userId, [input.termsVersion, input.privacyVersion]);
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from('legal_acceptances').upsert([
    {
      user_id: input.userId,
      document_type: 'terms',
      document_version: input.termsVersion,
      evidence_source: 'registration_form',
    },
    {
      user_id: input.userId,
      document_type: 'privacy_notice',
      document_version: input.privacyVersion,
      evidence_source: 'registration_form',
    },
  ], {
    onConflict: 'user_id,document_type,document_version,purchase_id',
    ignoreDuplicates: true,
  });
  if (error) throw new Error(`Could not record registration legal acceptances: ${error.message}`);
}

export async function recordCheckoutLegalAcceptances(input: {
  userId: string;
  purchaseId: string;
  contractTermsVersion: string;
  withdrawalVersion: string;
}): Promise<void> {
  validateIdentityAndVersions(input.userId, [
    input.contractTermsVersion,
    input.withdrawalVersion,
  ]);
  if (!UUID_PATTERN.test(input.purchaseId)) throw new Error('Invalid acceptance purchase');

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from('legal_acceptances').upsert([
    {
      user_id: input.userId,
      purchase_id: input.purchaseId,
      document_type: 'contract_terms',
      document_version: input.contractTermsVersion,
      evidence_source: 'checkout_confirmation',
    },
    {
      user_id: input.userId,
      purchase_id: input.purchaseId,
      document_type: 'immediate_performance',
      document_version: input.contractTermsVersion,
      evidence_source: 'checkout_confirmation',
    },
    {
      user_id: input.userId,
      purchase_id: input.purchaseId,
      document_type: 'withdrawal_acknowledgement',
      document_version: input.withdrawalVersion,
      evidence_source: 'checkout_confirmation',
    },
  ], {
    onConflict: 'user_id,document_type,document_version,purchase_id',
    ignoreDuplicates: true,
  });
  if (error) throw new Error(`Could not record checkout legal acceptances: ${error.message}`);
}
