/* PartFit Ghana — browser configuration.
   ONLY public values belong here. The Supabase anon/publishable key is designed
   to be public and is protected by row-level security; it is safe in the browser
   and in this repository. NEVER put the service-role key, WhatsApp Business API
   secrets or any privileged token here. */
window.PARTFIT_CONFIG = Object.freeze({
  supabaseUrl: 'https://zvhypcwaqnquwbmfrwuy.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2aHlwY3dhcW5xdXdibWZyd3V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NjkyNTQsImV4cCI6MjEwMjI0NTI1NH0.leFVK384t0_UN7QOa5p5xmFPu60xolXPcSWlTQCPpWM',
  currency: 'GHS',
  locale: 'en-GH',
  // The shop's WhatsApp number in international format, digits only, no '+'
  // (e.g. '233241234567'). While this is empty the app runs in TEST MODE: the
  // WhatsApp button copies the message to the clipboard instead of sending it,
  // so customer enquiries and the order fallback reach NOBODY. Set it before
  // launch.
  whatsapp: '',

  // The collection address shown to customers once an order is approved.
  pickupAddress: 'Spintex Road, Accra — exact collection point confirmed with approved order',

  // Flip to true only after the Paystack edge functions are deployed
  // (see SETUP-PAYMENTS.md). Until then the "Pay with MoMo" step stays hidden.
  paymentsEnabled: false
});
