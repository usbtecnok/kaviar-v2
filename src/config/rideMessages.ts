export const PASSENGER_TO_DRIVER_RIDE_QUICK_MESSAGES = [
  { code: 'at_location', text: 'Estou no local.' },
  { code: 'coming_to_pickup', text: 'Estou chegando ao ponto.' },
  { code: 'please_wait', text: 'Pode aguardar um instante?' },
  { code: 'need_safe_stop', text: 'Preciso parar em um local seguro.' },
  { code: 'feeling_unwell', text: 'Estou me sentindo mal.' },
  { code: 'comfort_request', text: 'Pode LIGAR O AR  por gentileza?' },
] as const;

export const DRIVER_TO_PASSENGER_RIDE_QUICK_MESSAGES = [
  { code: 'on_my_way', text: 'Estou a caminho.' },
  { code: 'already_arrived', text: 'Cheguei ao local.' },
  { code: 'waiting', text: 'Estou aguardando.' },
  { code: 'confirm_pickup', text: 'Pode confirmar o ponto de embarque?' },
  { code: 'need_safe_stop', text: 'Preciso parar em um local seguro.' },
  { code: 'moving_to_safe_spot', text: 'Vou seguir para um ponto mais seguro.' },
] as const;

export const RIDE_QUICK_MESSAGES = [
  ...PASSENGER_TO_DRIVER_RIDE_QUICK_MESSAGES,
  ...DRIVER_TO_PASSENGER_RIDE_QUICK_MESSAGES,
] as const;

const LEGACY_RIDE_QUICK_MESSAGES = [
  { code: 'need_kaviar_support', text: 'Preciso de ajuda do suporte KAVIAR.' },
] as const;

export const RIDE_QUICK_MESSAGE_TEXT_BY_CODE = Object.fromEntries(
  [...RIDE_QUICK_MESSAGES, ...LEGACY_RIDE_QUICK_MESSAGES].map((msg) => [msg.code, msg.text])
) as Record<string, string>;

export type RideQuickMessageCode = typeof RIDE_QUICK_MESSAGES[number]['code'];
