export type CatalogPreferenceGroup =
  | "PRIVACY"
  | "EMAIL_NOTIFICATION"
  | "PUSH_NOTIFICATION";

export type PreferenceCatalogEntry = {
  key: string;
  title: string;
  description: string;
  group: CatalogPreferenceGroup;
  sortOrder: number;
  defaultValue: boolean;
};

export type PreferenceItemResponse = {
  key: string;
  title: string;
  description: string;
  value: boolean;
};
