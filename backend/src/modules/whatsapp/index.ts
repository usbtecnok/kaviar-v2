import { WhatsAppService } from "./whatsapp.service";
import { WhatsAppEvents } from "./whatsapp-events";

export const whatsappService = new WhatsAppService();
export const whatsappEvents = new WhatsAppEvents(whatsappService);
