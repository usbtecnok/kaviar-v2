import { WhatsAppService } from "./whatsapp.service";

export class WhatsAppEvents {
  constructor(private readonly wa: WhatsAppService) {}

  driverAlert(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_ops_driver_alert_v1", variables: vars });
  }

  rideDriverAssigned(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_rides_passenger_driver_assigned_v2", variables: vars });
  }

  rideStarted(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_rides_started_v1", variables: vars });
  }

  rideDriverArrived(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_rides_driver_arrived_v1", variables: vars });
  }

  ridePassengerDriverArriving(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_rides_passenger_driver_arriving_v1", variables: vars });
  }

  rideDriverCompleted(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_rides_driver_completed_v2", variables: vars });
  }

  // v3: sem espera — "Valor bruto da corrida" + 🚀 O GIGANTE NÃO PARA 🚀
  // {{1}}=name {{2}}=pickup {{3}}=dropoff {{4}}=final_price {{5}}=credits {{6}}=balance
  rideDriverCompletedV3(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_rides_driver_completed_v3", variables: vars });
  }

  // v4: com espera — base + adicional + bruto final + 🚀 O GIGANTE NÃO PARA 🚀
  // {{1}}=name {{2}}=pickup {{3}}=dropoff {{4}}=base_price {{5}}=wait_charge {{6}}=final_price {{7}}=credits {{8}}=balance
  rideDriverCompletedV4Wait(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_rides_driver_completed_v4_wait", variables: vars });
  }

  ridePassengerCompleted(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_rides_passenger_completed_v1", variables: vars });
  }

  rideCancelled(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_rides_cancelled_v1", variables: vars });
  }

  ridePassengerCancelled(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_rides_passenger_cancelled_v1", variables: vars });
  }

  rideDriverCancelled(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_rides_driver_cancelled_v1", variables: vars });
  }

  rideDestinationChanged(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_rides_destination_changed_v1", variables: vars });
  }

  inviteDriver(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_invites_driver_v1", variables: vars });
  }

  inviteInvestor(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_invites_investor_v2", variables: vars });
  }

  paymentReceipt(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_payment_receipt_v1", variables: vars });
  }

  consultantWelcome(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_consultant_welcome_v1", variables: vars });
  }

  authPasswordReset(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "copy_kaviar_auth_password_reset_v1", variables: vars });
  }

  authVerificationCode(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "copy_kaviar_auth_verification_code_v1", variables: vars });
  }

  rideScheduledReminder(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_rides_scheduled_reminder_v1", variables: vars });
  }

  rideScheduledSearching(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_rides_scheduled_searching_v2", variables: vars });
  }

  followupAngel(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_followup_angel_v1", variables: vars });
  }

  driverReactivation(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_driver_reactivation_v1", variables: vars });
  }
}
