const env = process.env;

export const WHATSAPP_TEMPLATES = {
  kaviar_ops_driver_alert_v1: env.WA_TPL_OPS_DRIVER_ALERT || "",
  kaviar_rides_driver_completed_v1: env.WA_TPL_DRIVER_COMPLETED_V1 || "",
  kaviar_rides_driver_completed_v2: env.WA_TPL_DRIVER_COMPLETED_V2 || "",
  kaviar_rides_driver_completed_v3: env.WA_TPL_DRIVER_COMPLETED_V3 || "",
  kaviar_rides_driver_completed_v4_wait: env.WA_TPL_DRIVER_COMPLETED_V4_WAIT || "",
  kaviar_rides_passenger_driver_arriving_v1: env.WA_TPL_PASSENGER_ARRIVING || "",
  kaviar_rides_started_v1: env.WA_TPL_RIDES_STARTED || "",
  kaviar_rides_cancelled_v1: env.WA_TPL_RIDES_CANCELLED || "",
  kaviar_rides_passenger_cancelled_v1: env.WA_TPL_PASSENGER_CANCELLED || "",
  kaviar_rides_destination_changed_v1: env.WA_TPL_DEST_CHANGED || "",
  kaviar_rides_driver_assigned_v1: env.WA_TPL_DRIVER_ASSIGNED_V1 || "",
  kaviar_rides_passenger_driver_assigned_v2: env.WA_TPL_PASSENGER_DRIVER_ASSIGNED_V2 || "",
  kaviar_rides_driver_cancelled_v1: env.WA_TPL_DRIVER_CANCELLED || "",
  kaviar_rides_passenger_completed_v1: env.WA_TPL_PASSENGER_COMPLETED || "",
  kaviar_invites_driver_v1: env.WA_TPL_INVITE_DRIVER || "",
  kaviar_invites_investor_v2: env.WA_TPL_INVITE_INVESTOR || "",
  kaviar_rides_driver_arrived_v1: env.WA_TPL_DRIVER_ARRIVED || "",
  kaviar_payment_receipt_v1: env.WA_TPL_PAYMENT_RECEIPT || "",
  kaviar_consultant_welcome_v1: env.WA_TPL_CONSULTANT_WELCOME || "",
  copy_kaviar_auth_password_reset_v1: env.WA_TPL_PASSWORD_RESET || "",
  copy_kaviar_auth_verification_code_v1: env.WA_TPL_VERIFICATION_CODE || "",
  kaviar_rides_scheduled_reminder_v1: env.WA_TPL_SCHEDULED_REMINDER || "",
  kaviar_rides_scheduled_searching_v2: env.WA_TPL_SCHEDULED_SEARCHING || "",
  kaviar_followup_angel_v1: env.WA_TPL_FOLLOWUP_ANGEL || "",
  kaviar_driver_reactivation_v1: env.WA_TPL_DRIVER_REACTIVATION || "",
} as const;

export type WhatsAppTemplateName = keyof typeof WHATSAPP_TEMPLATES;

export function getWhatsAppContentSid(name: WhatsAppTemplateName): string {
  return WHATSAPP_TEMPLATES[name];
}
