export interface TwilioRequestEvents {
  request: {
    url: string;
    method?: string;
    parameters: {
      to?: string;
      from?: string;
      call_status?: string;
      [key: string]: any;
    };
  };
  response: {
    response_code: string;
    date_created: string;
    response_body: any;
    [key: string]: any;
  };
}
