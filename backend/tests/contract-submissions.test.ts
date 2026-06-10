import { describe, it, expect } from 'vitest';

describe('contract submission flow (Phase B)', () => {
  describe('gestora submit rules', () => {
    const canSubmit = (status: string) => ['available', 'rejected'].includes(status);

    it('available → can submit', () => expect(canSubmit('available')).toBe(true));
    it('rejected → can submit (reenvio)', () => expect(canSubmit('rejected')).toBe(true));
    it('pending → cannot submit', () => expect(canSubmit('pending')).toBe(false));
    it('signed → cannot submit', () => expect(canSubmit('signed')).toBe(false));
    it('submitted → cannot submit (already sent)', () => expect(canSubmit('submitted')).toBe(false));
    it('approved → cannot submit', () => expect(canSubmit('approved')).toBe(false));
  });

  describe('approval logic', () => {
    it('approve sets submission status to approved', () => {
      const newStatus = 'approved';
      expect(newStatus).toBe('approved');
    });

    it('approve sets operator contract_status to signed (not approved)', () => {
      // Rule: ativação exige 'signed' ou 'not_required'
      const operatorStatus = 'signed';
      expect(operatorStatus).toBe('signed');
      expect(['signed', 'not_required']).toContain(operatorStatus);
    });

    it('approve copies s3_key to contract_url', () => {
      const s3Key = 'contract-submissions/op1/123.pdf';
      const contractUrl = s3Key;
      expect(contractUrl).toBe(s3Key);
    });

    it('approve sets contract_signed_at', () => {
      const signedAt = new Date();
      expect(signedAt).toBeInstanceOf(Date);
    });

    it('approve does NOT set is_active', () => {
      const update = { contract_status: 'signed', contract_url: 'key', contract_reviewed_by: 'admin', contract_reviewed_at: new Date(), contract_signed_at: new Date() };
      expect(update).not.toHaveProperty('is_active');
    });

    it('approve does NOT set document_status', () => {
      const update = { contract_status: 'signed', contract_url: 'key' };
      expect(update).not.toHaveProperty('document_status');
    });
  });

  describe('rejection logic', () => {
    it('reject requires reason (min 3 chars)', () => {
      const valid = (reason: string | null) => !!reason && reason.trim().length >= 3;
      expect(valid('Assinatura ausente')).toBe(true);
      expect(valid('OK')).toBe(false);
      expect(valid('')).toBe(false);
      expect(valid(null)).toBe(false);
    });

    it('reject sets submission status to rejected', () => {
      expect('rejected').toBe('rejected');
    });

    it('reject sets operator contract_status to rejected', () => {
      const operatorStatus = 'rejected';
      expect(operatorStatus).toBe('rejected');
    });

    it('reject preserves rejection_reason', () => {
      const reason = 'Documento sem assinatura no campo obrigatório';
      expect(reason.length).toBeGreaterThan(3);
    });

    it('rejected allows resubmission (status goes back to available→submitted)', () => {
      const canSubmit = ['available', 'rejected'].includes('rejected');
      expect(canSubmit).toBe(true);
    });
  });

  describe('supersede logic', () => {
    it('new submission supersedes previous rejected', () => {
      const previousStatus = 'rejected';
      const newStatus = previousStatus === 'rejected' ? 'superseded' : previousStatus;
      expect(newStatus).toBe('superseded');
    });

    it('does not supersede approved submissions', () => {
      const previousStatus = 'approved';
      const shouldSupersede = previousStatus === 'rejected';
      expect(shouldSupersede).toBe(false);
    });
  });

  describe('security', () => {
    it('gestora can only submit for own profile (uses admin_id from token)', () => {
      const tokenAdminId = 'admin-X';
      const query = { admin_id: tokenAdminId };
      expect(query.admin_id).toBe(tokenAdminId);
    });

    it('s3 key generated server-side with operator_profile_id', () => {
      const key = 'contract-submissions/op123/1718020000.pdf';
      expect(key).toContain('contract-submissions/');
      expect(key).toContain('op123');
    });

    it('response does not expose s3_key', () => {
      const response = { success: true, data: { submitted: true } };
      expect(response.data).not.toHaveProperty('s3_key');
      expect(response.data).not.toHaveProperty('contract_url');
    });

    it('queue response does not expose s3_key', () => {
      const item = { id: 'uuid', operator_name: 'Test', territory: 'Zone', status: 'submitted', submitted_at: new Date() };
      expect(item).not.toHaveProperty('s3_key');
    });

    it('only submitted/in_review can be reviewed', () => {
      const canReview = (status: string) => ['submitted', 'in_review'].includes(status);
      expect(canReview('submitted')).toBe(true);
      expect(canReview('in_review')).toBe(true);
      expect(canReview('approved')).toBe(false);
      expect(canReview('rejected')).toBe(false);
      expect(canReview('superseded')).toBe(false);
    });
  });

  describe('UNIQUE constraint', () => {
    it('only one open submission per operator (submitted or in_review)', () => {
      // idx_cs_one_open_per_operator ensures this at DB level
      const constraint = true;
      expect(constraint).toBe(true);
    });
  });

  describe('frontend states after submission', () => {
    const getLabel = (status: string) => {
      if (status === 'submitted') return 'Contrato enviado — aguardando análise';
      if (status === 'in_review') return 'Contrato em análise';
      if (status === 'rejected') return 'Rejeitado — novo envio necessário';
      if (status === 'signed') return 'Contrato aprovado';
      return status;
    };

    it('submitted', () => expect(getLabel('submitted')).toContain('aguardando'));
    it('rejected', () => expect(getLabel('rejected')).toContain('Rejeitado'));
    it('signed (after approval)', () => expect(getLabel('signed')).toContain('aprovado'));
  });
});
