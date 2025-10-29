import { AppViewItem } from './app-view.entity';

export interface UserPreferences {
  defaultLang: string;
  appViewId?: string | null;
  appView?: AppViewData | null;
}

export interface AppViewData {
  uuid?: string;
  name?: string;
  applications: AppViewItem[];
  profile: AppViewItem[];
}

export interface User {
  uuid: string;
  username: string;
  role: string;
  preferences?: UserPreferences | null;
}
