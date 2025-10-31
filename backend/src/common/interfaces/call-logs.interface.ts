export interface CallLog {
    call_sid: string;
    from_number: string;
    to_number: string;
    status: string;
    duration: number;
    start_time: Date | string | null; 
    end_time: Date | string | null;  
    notes?: string; 
    user_id?: string;    
    created_at?: Date | string | null; 
    updated_at?: Date | string | null;
    recording_sid?: string;
    recording_url?: string;
}