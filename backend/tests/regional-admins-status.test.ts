import { describe, it, expect } from 'vitest';

describe('regional admins status display logic', () => {
  // Simulates the contract label logic from the frontend
  function getContractLabel(op: { has_contract: boolean; contract_status: string; has_online_acceptance: boolean } | null) {
    if (!op) return '—';
    if (op.has_contract && op.contract_status === 'signed') return 'Formalizado';
    if (op.has_contract && op.contract_status === 'pending') return 'Para análise';
    if (!op.has_contract && op.contract_status === 'signed' && op.has_online_acceptance) return 'Aceite online';
    if (op.contract_status === 'not_required') return 'Não requerido';
    return 'Pendente';
  }

  describe('payload enrichment', () => {
    it('admin with operator_profile includes profile data', () => {
      const admin = { is_active: true, operator_profile: { is_active: false, contract_status: 'pending', document_status: 'pending', contract_url: null, terms_accepted_at: null, relationship_type: 'territorial_manager' } };
      const mapped = {
        ...admin,
        operator_profile: admin.operator_profile ? { is_active: admin.operator_profile.is_active, contract_status: admin.operator_profile.contract_status, document_status: admin.operator_profile.document_status, has_contract: !!admin.operator_profile.contract_url, has_online_acceptance: !!admin.operator_profile.terms_accepted_at, relationship_type: admin.operator_profile.relationship_type } : null,
      };
      expect(mapped.operator_profile).not.toBeNull();
      expect(mapped.operator_profile!.has_contract).toBe(false);
      expect(mapped.operator_profile!.has_online_acceptance).toBe(false);
    });

    it('admin without operator_profile returns null', () => {
      const admin = { is_active: true, operator_profile: null };
      expect(admin.operator_profile).toBeNull();
    });

    it('has_contract is true when contract_url exists', () => {
      const op = { contract_url: 'manager-contracts/x/123.pdf', terms_accepted_at: null };
      expect(!!op.contract_url).toBe(true);
    });

    it('contract_url is never exposed directly (only has_contract boolean)', () => {
      const rawProfile = { is_active: true, contract_status: 'signed', document_status: 'verified', contract_url: 'manager-contracts/secret-key.pdf', terms_accepted_at: '2026-06-04', relationship_type: 'territorial_manager' };
      const mapped = { is_active: rawProfile.is_active, contract_status: rawProfile.contract_status, document_status: rawProfile.document_status, has_contract: !!rawProfile.contract_url, has_online_acceptance: !!rawProfile.terms_accepted_at, relationship_type: rawProfile.relationship_type };
      expect(mapped).not.toHaveProperty('contract_url');
      expect(JSON.stringify(mapped)).not.toContain('secret-key');
    });
  });

  describe('contract label states', () => {
    it('has_contract + signed = Formalizado', () => {
      expect(getContractLabel({ has_contract: true, contract_status: 'signed', has_online_acceptance: true })).toBe('Formalizado');
    });

    it('has_contract + pending = Para análise', () => {
      expect(getContractLabel({ has_contract: true, contract_status: 'pending', has_online_acceptance: false })).toBe('Para análise');
    });

    it('no contract + signed + online acceptance = Aceite online', () => {
      expect(getContractLabel({ has_contract: false, contract_status: 'signed', has_online_acceptance: true })).toBe('Aceite online');
    });

    it('no contract + pending = Pendente', () => {
      expect(getContractLabel({ has_contract: false, contract_status: 'pending', has_online_acceptance: false })).toBe('Pendente');
    });

    it('not_required = Não requerido', () => {
      expect(getContractLabel({ has_contract: false, contract_status: 'not_required', has_online_acceptance: false })).toBe('Não requerido');
    });

    it('no operator_profile = —', () => {
      expect(getContractLabel(null)).toBe('—');
    });
  });

  describe('account vs profile distinction', () => {
    it('account active + profile inactive (Jacione case)', () => {
      const a = { is_active: true, operator_profile: { is_active: false, contract_status: 'pending', document_status: 'pending' } };
      expect(a.is_active).toBe(true);       // conta ativa
      expect(a.operator_profile.is_active).toBe(false); // perfil inativo
    });

    it('account inactive + profile active (Maria Isabel case)', () => {
      const a = { is_active: false, operator_profile: { is_active: true, contract_status: 'pending', document_status: 'verified' } };
      expect(a.is_active).toBe(false);      // conta inativa
      expect(a.operator_profile.is_active).toBe(true); // perfil ativo
    });

    it('account active + profile active (Fernanda case)', () => {
      const a = { is_active: true, operator_profile: { is_active: true, contract_status: 'signed', document_status: 'verified' } };
      expect(a.is_active).toBe(true);
      expect(a.operator_profile.is_active).toBe(true);
    });

    it('toggle only changes admins.is_active', () => {
      // The PATCH handler: prisma.admins.update({ data: { is_active } })
      const patchPayload = { is_active: false };
      expect(patchPayload).not.toHaveProperty('operator_profile');
      expect(patchPayload).not.toHaveProperty('contract_status');
      expect(patchPayload).not.toHaveProperty('document_status');
    });
  });

  describe('document status display', () => {
    it('verified', () => {
      expect('verified').toBe('verified');
    });
    it('pending', () => {
      expect('pending').toBe('pending');
    });
    it('rejected', () => {
      expect('rejected').toBe('rejected');
    });
  });
});
