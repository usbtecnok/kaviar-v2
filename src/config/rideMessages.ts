export const RIDE_QUICK_MESSAGES = [
  { code: 'on_my_way', text: 'Estou a caminho' },
  { code: 'already_arrived', text: 'Já cheguei' },
  { code: 'at_location', text: 'Estou no local' },
  { code: 'waiting', text: 'Estou aguardando' },
  { code: 'please_wait', text: 'Pode aguardar um instante?' },
  { code: 'contact_support', text: 'Preciso de ajuda do suporte KAVIAR' },
] as const;

export type RideQuickMessageCode = typeof RIDE_QUICK_MESSAGES[number]['code'];
