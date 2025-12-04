export const statuses = {
  NOT_STARTED: 0,
  ACTIVE: 1,
  STOPPED: 2,
} as const;

export const errorCodes = {
  UNSUPPORTED_TRANSITIONS: 10,
  INVALID_EVENT_TYPE: 20,
  JOB_TIME_LIMIT_EXCEEDED: 40,
  RUNTIME_ERROR: 50,
} as const;
