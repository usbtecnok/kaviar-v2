import { WhatsAppService } from "./whatsapp.service";

export class WhatsAppEvents {
  constructor(private readonly wa: WhatsAppService) {}

  driverAlert(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_ops_driver_alert_v1", variables: vars });
  }

  rideDriverAssigned(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_rides_driver_assigned_v1", variables: vars });
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
    return this.wa.sendTemplate({ to, template: "kaviar_rides_driver_completed_v1", variables: vars });
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

  paymentReceipt(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "kaviar_payment_receipt_v1", variables: vars });
  }

  authPasswordReset(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "copy_kaviar_auth_password_reset_v1", variables: vars });
  }

  authVerificationCode(to: string, vars: Record<string, any>) {
    return this.wa.sendTemplate({ to, template: "copy_kaviar_auth_verification_code_v1", variables: vars });
  }
}
