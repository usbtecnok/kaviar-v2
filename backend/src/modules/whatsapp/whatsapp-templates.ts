export const WHATSAPP_TEMPLATES = {
  kaviar_ops_driver_alert_v1: "HXc467b5bba6e16cd1d30358a5f51799f0",
  kaviar_rides_driver_completed_v1: "HX2e57c7eed10ee237d6176d694243a249",
  // v2: modelo créditos — {{1}}=name {{2}}=pickup {{3}}=dropoff {{4}}=price {{5}}=credits_consumed {{6}}=credit_balance
  kaviar_rides_driver_completed_v2: "HX631024ba73ffcd00f964584802c88460",
  kaviar_rides_passenger_driver_arriving_v1: "HX04bf3d321655f3ebd3051d1fb50c119a",
  kaviar_rides_started_v1: "HX057acbb5854296d16b7eb4e670ba6303",
  kaviar_rides_cancelled_v1: "Hxed80850e97e7ee739b09767b09b1a3f6",
  kaviar_rides_passenger_cancelled_v1: "HX8af4d584b2f063a5898fbf7d9dd4fb85",
  kaviar_rides_destination_changed_v1: "HX5015a4ab34b3a231427e89835ad29415",
  kaviar_rides_driver_assigned_v1: "HX4beee38698df27b25822ce87cb5c9905",
  // v2: segurança passageiro — {{1}}=passenger_name {{2}}=driver_name {{3}}=vehicle_model {{4}}=vehicle_color {{5}}=vehicle_plate
  kaviar_rides_passenger_driver_assigned_v2: "HX8aefeb21caaca7f73a2f85be9298e208",
  kaviar_rides_driver_cancelled_v1: "HX3f5789f32a05ea805735351720c6b0a3",
  kaviar_rides_passenger_completed_v1: "HXb370f31ef271b85e0abf17e921ef16db",
  kaviar_invites_driver_v1: "HXd4fb99531949db1ac1a4bd232f387bf6",
  kaviar_invites_investor_v1: process.env.TWILIO_TEMPLATE_INVITE_INVESTOR || "",
  kaviar_rides_driver_arrived_v1: "HX1ec498822ddee9172cbdddafb53d3dc8",
  kaviar_payment_receipt_v1: "HXb1cf76a5d9693227510cca86728884ca",
  kaviar_consultant_welcome_v1: process.env.TWILIO_TEMPLATE_CONSULTANT_WELCOME || "",
  copy_kaviar_auth_password_reset_v1: "HX514417adf01e3725e58c93beaa245b5c",
  copy_kaviar_auth_verification_code_v1: "HXaa4b418e3e844c9d52249371c6fef8a3",
} as const;

export type WhatsAppTemplateName = keyof typeof WHATSAPP_TEMPLATES;

export function getWhatsAppContentSid(name: WhatsAppTemplateName): string {
  return WHATSAPP_TEMPLATES[name];
}
