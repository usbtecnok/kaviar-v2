/**
 * WhatsApp Templates Configuration
 * 
 * Templates must be approved by WhatsApp before use.
 * Content SIDs are obtained after approval in Twilio Console.
 */

export enum WhatsAppTemplate {
  // Phase 1: Essential templates
  INVITE_INVESTOR = 'kaviar_invites_investor_v1',
  RIDE_DRIVER_ASSIGNED = 'kaviar_rides_driver_assigned_v1',
  RIDE_PASSENGER_ARRIVING = 'kaviar_rides_passenger_driver_arriving_v1'
}

export interface TemplateConfig {
  sid: string;
  name: string;
  variables: string[];
  description: string;
}

/**
 * Template configurations
 * SIDs come from env vars after WhatsApp approval
 */
export const WHATSAPP_TEMPLATES: Record<WhatsAppTemplate, TemplateConfig> = {
  [WhatsAppTemplate.INVITE_INVESTOR]: {
    sid: process.env.TWILIO_TEMPLATE_INVITE_INVESTOR || '',
    name: 'kaviar_invites_investor_v1',
    variables: ['name', 'role', 'link', 'login_url'],
    description: 'Investor/Angel Viewer invitation with password setup link'
  },
  
  [WhatsAppTemplate.RIDE_DRIVER_ASSIGNED]: {
    sid: process.env.TWILIO_TEMPLATE_RIDE_DRIVER_ASSIGNED || '',
    name: 'kaviar_rides_driver_assigned_v1',
    variables: ['pickup', 'dropoff', 'price', 'eta'],
    description: 'New ride assigned to driver'
  },
  
  [WhatsAppTemplate.RIDE_PASSENGER_ARRIVING]: {
    sid: process.env.TWILIO_TEMPLATE_RIDE_PASSENGER_ARRIVING || '',
    name: 'kaviar_rides_passenger_driver_arriving_v1',
    variables: ['driver_name', 'car_model', 'plate', 'rating', 'eta'],
    description: 'Driver is arriving to pick up passenger'
  }
};

/**
 * Check if a template is configured (has Content SID)
 */
export function isTemplateConfigured(template: WhatsAppTemplate): boolean {
  const config = WHATSAPP_TEMPLATES[template];
  return !!config.sid && config.sid.length > 0;
}

/**
 * Get template configuration
 */
export function getTemplateConfig(template: WhatsAppTemplate): TemplateConfig {
  return WHATSAPP_TEMPLATES[template];
}
