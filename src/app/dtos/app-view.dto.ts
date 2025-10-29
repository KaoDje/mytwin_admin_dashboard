export interface AppViewItemInput {
  id: string;
  order: number;
}

export interface CreateAppViewInput {
  name: string;
  applications: AppViewItemInput[];
  profile: AppViewItemInput[];
}

export interface UpdateAppViewInput {
  name?: string;
  applications?: AppViewItemInput[];
  profile?: AppViewItemInput[];
}
