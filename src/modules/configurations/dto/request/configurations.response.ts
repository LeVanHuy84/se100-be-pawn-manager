export interface ConfigurationResponse {
  key: string; // paramKey
  value: string; // paramValue
  group?: string | null; // paramGroup
  description?: string | null;
  dataType: string; // dataType
}
