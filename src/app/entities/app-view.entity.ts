export interface AppViewItem {
  id: string;
  order: number;
}

export interface AppView {
  uuid: string;
  name: string;
  applications: AppViewItem[];
  profile: AppViewItem[];
}
