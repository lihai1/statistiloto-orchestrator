export interface GenerateFormRequest {
  howMany: number;
  formType?: number;
  willBe?: number[];
  from?: string;
  to?: string;
  strength?: 'strong' | 'weak';
}

export interface StatisticsRequest {
  howMany: number;
  formType?: number;
  from?: string;
  to?: string;
  strength?: 'strong' | 'weak';
}

export interface AnalyzeRequest {
  form: number[];
  from?: string;
  to?: string;
}

export interface PairResponse {
  numbers: number[];
  count: number;
}

export interface FormMatchResponse {
  drawId: string;
  drawDate: string;
  matchedNumbers: number[];
  matchCount: number;
}

export interface LotteryResultResponse {
  forms?: number[][];
  pairs?: PairResponse[];
  frequency?: Record<number, number>;
  matches?: FormMatchResponse[];
}

export interface SaveNumbersRequest {
  category: string;
  numbers: number[];
  willBe?: number[];
  dateFrom?: string;
  dateTo?: string;
}

export interface SavedNumbersResponse {
  id: number;
  category: string;
  numbers: number[];
  willBe?: number[];
  dateFrom?: string;
  dateTo?: string;
  createdAt: string;
}

export interface UserProfileResponse {
  sub: string;
  email: string;
  displayName: string;
  roles: string[];
}
