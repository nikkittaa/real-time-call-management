export interface TwilioRequestEvents {
  request: {
    url: string;
    parameters: any[];
  };
  response: {
    response_body: any;
  };
}
