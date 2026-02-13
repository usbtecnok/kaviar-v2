export const WHATSAPP_TEMPLATES = {
  kaviar_ops_driver_alert_v1: "HXc467b5bba6e16cd1d30358a5f51799f0",
  kaviar_rides_driver_completed_v1: "HX697bc0dbe68bd5d1a83ef0ddf07bdb05",
  kaviar_rides_passenger_driver_arriving_v1: "HX04bf3d321655f3ebd3051d1fb50c119a",
  kaviar_rides_started_v1: "HX057acbb5854296d16b7eb4e670ba6303",
  kaviar_rides_cancelled_v1: "Hxed80850e97e7ee739b09767b09b1a3f6",
  kaviar_rides_passenger_cancelled_v1: "HX8af4d584b2f063a5898fbf7d9dd4fb85",
  kaviar_rides_destination_changed_v1: "HX5015a4ab34b3a231427e89835ad29415",
  kaviar_rides_driver_assigned_v1: "HX4beee38698df27b25822ce87cb5c9905",
  kaviar_rides_driver_cancelled_v1: "HX3f5789f32a05ea805735351720c6b0a3",
  kaviar_rides_passenger_completed_v1: "HXb370f31ef271b85e0abf17e921ef16db",
  kaviar_invites_driver_v1: "HXd4fb99531949db1ac1a4bd232f387bf6",
  kaviar_rides_driver_arrived_v1: "HX1ec498822ddee9172cbdddafb53d3dc8",
  kaviar_payment_receipt_v1: "HXb1cf76a5d9693227510cca86728884ca",
  copy_kaviar_auth_password_reset_v1: "HX514417adf01e3725e58c93beaa245b5c",
  copy_kaviar_auth_verification_code_v1: "HX4023e87b9f17b542c8a02d0e939a0a91",
} as const;

export type WhatsAppTemplateName = keyof typeof WHATSAPP_TEMPLATES;

export function getWhatsAppContentSid(name: WhatsAppTemplateName): string {
  return WHATSAPP_TEMPLATES[name];
}
