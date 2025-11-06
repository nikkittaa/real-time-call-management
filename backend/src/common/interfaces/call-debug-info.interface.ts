export interface CallDebugInfo {
  callSid: string;
  from: string;
  to: string;
  date_created: Date | string | null;
  start_time: Date | string | null;
  end_time: Date | string | null;
  direction: string;
  duration: number;
  status: string;
  price: number;
  price_unit: string;
  recordings: string;
  events: string;
}
