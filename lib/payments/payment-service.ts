export type CreateCheckoutPreferenceInput = {
  businessId: string;
  appointmentId: string;
  credentialKey: string;
  serviceName: string;
  depositAmount: number;
  customerEmail: string;
  webhookUrl: string;
  successUrl: string;
  failureUrl: string;
};

export type CheckoutPreference = {
  providerPreferenceId: string;
  checkoutUrl: string;
};

export type PaymentService = {
  createCheckoutPreference(input: CreateCheckoutPreferenceInput): Promise<CheckoutPreference>;
};
