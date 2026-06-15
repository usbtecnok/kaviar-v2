/** Configuração local do módulo Moto — flags e textos oficiais. */

export const MOTO_FLAGS = {
  enabled: false,
  motoPassageiroVisible: false,
  motoExpressVisible: false,
  PROMO_CARD_ENABLED: false,
} as const;

export const MOTO_TEXTS = {
  modalTitle: 'MOTO PASSAGEIRO KAVIAR',
  modalSubtitle: 'Antes de continuar, confirme as orientações de segurança.',
  helmetWarning: 'O uso do capacete é OBRIGATÓRIO.',
  helmetProvided: 'O motorista fornecerá um capacete higienizado para você.',
  verifyBefore: 'Confira a foto do motociclista, a foto da moto, placa, modelo e cor antes de embarcar.',
  acceptTerms: 'Li e aceito os termos de uso do serviço Moto Passageiro KAVIAR.',
  acceptRisks: 'Estou ciente dos riscos envolvidos e assumo responsabilidade.',
  helmetCommitment: 'Comprometo-me a usar o capacete durante toda a viagem.',
  buttonPrimary: 'ACEITAR E CONTINUAR',
  buttonSecondary: 'VOLTAR',
} as const;
