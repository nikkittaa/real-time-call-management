export interface CallDebugInfo {
  callSid: string;
  date_created: Date | string | null;

  direction: string;

  price: number;
  price_unit: string;
  child_calls: string;
  recordings: string;
  events: string;
}
