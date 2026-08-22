// Category constants matching the legacy NumbersCategory values.
export const NumbersCategory = {
  LUCKY: 'lucky',
  USER_GENERATED: 'user-generated',
  GROUP_CALCULATED: 'group-calculated',
} as const;

export type NumbersCategoryType = (typeof NumbersCategory)[keyof typeof NumbersCategory];

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

export interface FrequencyEntryResponse {
  numbers: number[];
  count: number;
}

export interface FrequencyGroupResponse {
  size: number;
  combos: number;
  entries: FrequencyEntryResponse[];
}

export interface LotteryResultResponse {
  forms?: number[][];
  pairs?: PairResponse[];
  frequencyGroups?: FrequencyGroupResponse[];
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
