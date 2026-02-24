const WHATSAPP_NUMBER = import.meta.env.VITE_SUPPORT_WHATSAPP || '5521980669989';

export const openWhatsAppSupport = (message) => {
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
  window.open(url, '_blank');
};

export const getPasswordResetWhatsAppMessage = (email) => {
  return `Olá! Preciso resetar minha senha no KAVIAR Driver.\n\nEmail: ${email}\n\nPor favor, me ajude a recuperar o acesso.`;
};

export const getDriverAccessWhatsAppMessage = (name, email, phone) => {
  return `Olá! Quero acesso ao KAVIAR Driver.\n\nNome: ${name}\nEmail: ${email}\nTelefone: ${phone || 'Não informado'}\n\nPreciso criar minha conta.`;
};
