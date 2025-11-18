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
    response_body: any;
    [key: string]: any;
  };
}
