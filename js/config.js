/**
 * RACROB Water Pump Supplier - Supabase Configuration
 * 
 * Instructions:
 * Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project credentials
 * from your Supabase Dashboard: Project Settings -> API.
 * 
 * IMPORTANT: NEVER put your service_role key here!
 * Only the public anon key belongs in frontend client code.
 */

export const SUPABASE_URL = "https://pdwxolytwyrofzdhqwmx.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkd3hvbHl0d3lyb2Z6ZGhxd214Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMDEzMzgsImV4cCI6MjEwNjY3NzMzOH0.4utlgVxEmAUidf7ZKYojTtzEOHVekQzANbh4R22PHOw";

// Business Static Defaults (used if database is temporarily connecting)
export const DEFAULT_CONFIG = {
  businessName: "RACROB",
  businessCategory: "Water Pump Supplier",
  phone: "0940414141",
  email: "contact@racrob.et",
  address: "Wereda 03, H.NO. 1263, Office NO.201, Ethio China St, Addis Abeba, Ethiopia",
  defaultPaymentAccount: "1000",
  bankName: "Commercial Bank of Ethiopia (CBE)",
  accountHolder: "RACROB Trading PLC",
  facebookUrl: "https://www.facebook.com/share/1FaYKw8d7y/",
  twitterUrl: "https://twitter.com/racrob_et",
  tiktokUrl: "https://www.tiktok.com/@racrob_et",
  instagramUrl: "https://www.instagram.com/racrob_et",
  linkedinUrl: "https://www.linkedin.com/company/racrob",
  googleMapsUrl: "https://maps.google.com/?q=Wereda+03+H.NO.+1263+Office+NO.201+Ethio+China+St+Addis+Abeba+Ethiopia",
  googleMapsEmbed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15761.764516315273!2d38.7610!3d9.0050!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x164b85cef0a8d6e9%3A0x6b72a6bca23f46f!2sEthio+China+St%2C+Addis+Ababa%2C+Ethiopia!5e0!3m2!1sen!2set!4v1700000000000"
};
