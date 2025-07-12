export enum JILFieldOrder {
  INSERT_JOB = 1,
  JOB_TYPE = 2,
  BOX_NAME = 3,
  OWNER = 4,
  MACHINE = 5,
  COMMAND = 6,
  PERMISSION = 7,
  DESCRIPTION = 8,
  TIMEZONE = 9,
  START_TIMES = 10,
  DAYS_OF_WEEK = 11,
  RUN_CALENDAR = 12,
  DATE_CONDITIONS = 13,
  CONDITION = 14,
  STD_OUT_FILE = 15,
  STD_ERR_FILE = 16,
  PROFILE = 17,
  WATCH_FILE = 18,
  WATCH_INTERVAL = 19,
  MAX_RUN_ALARM = 20,
  JOB_LOAD = 21,
  PRIORITY = 22,
  ALARM_IF_FAIL = 23,
  ALARM_IF_TERMINATED = 24,
  STATUS = 25
}

// Helper function to get field order or default value
export function getFieldOrder(fieldName: string): number {
  const upperFieldName = fieldName.toUpperCase() as keyof typeof JILFieldOrder;
  return JILFieldOrder[upperFieldName] || 999; // Default high value for undefined fields
}

// Define fields that should NEVER appear in JIL files (naming convention only)
export const EXCLUDED_FROM_JIL = [
  'csi', 'efforttype', 'prodlob', 'purpose', 'loadfreq', 'loadlayer',
  'dev', 'uat', 'prod', 'cob', 'environments', 'funofjob', 'jobtitle'
];

// Define job-type specific field restrictions
export const JOB_TYPE_RESTRICTIONS = {
  'cmd': ['start_times', 'watch_file', 'watch_interval', 'max_run_alarm', 'job_load', 'priority'],
  'fw': ['start_times', 'std_out_file', 'std_err_file', 'profile'],
  'cfw': ['start_times', 'std_out_file', 'std_err_file', 'profile', 'max_run_alarm'],
  'box': ['std_out_file', 'std_err_file', 'profile', 'watch_file', 'watch_interval', 'max_run_alarm', 'job_load', 'priority']
};
