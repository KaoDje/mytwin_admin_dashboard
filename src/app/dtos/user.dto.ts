export interface CreateUserInput {
  username: string;
  password: string;
  role?: string;
  defaultLang?: string;
  appViewId?: string;
}

export interface UpdateUserInput {
  username?: string;
}

export interface UpdateUserPreferencesInput {
  defaultLang?: string;
}
