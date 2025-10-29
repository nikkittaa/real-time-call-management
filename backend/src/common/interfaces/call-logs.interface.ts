export interface CallLog {
    call_sid: string;
    from_number: string;
    to_number: string;
    status: string;
    duration: number;
    start_time: Date; 
    end_time: Date;  
    notes?: string; 
    user_id?: string;    
    created_at?: Date; 
    recording_sid?: string;
    recording_url?: string;
  }