import { fsmStatuses } from './constants';

export type NonEmptyArray<T> = [T, ...T[]];

export type PartialOneRecord<K extends PropertyKey, V> = Partial<Record<K, V>> & { [P in K]: Required<Pick<Record<K, V>, P>> }[K];

export type StateMachineStateData<TStateName extends string> = {
  stateName: TStateName;
};

export type StateMachineCondFunction<TStateName extends string, TContext extends object> = (
  context: TContext,
  stateData: StateMachineStateData<TStateName>,
) => boolean;

export type StateMachineCompleteFunction = () => void;

export type StateMachineJobFunction<TContext extends object> = (context: TContext, complete: StateMachineCompleteFunction) => void | Promise<void>;

export type StateMachineActionFunction<TStateName extends string, TContext extends object> = (
  context: TContext,
  stateData: StateMachineStateData<TStateName>,
) => void;

export type StateMachineActionList<TStateName extends string, TContext extends object> = NonEmptyArray<
  StateMachineActionFunction<TStateName, TContext>
>;

export type StateMachineTransitionObject<TStateName extends string, TContext extends object> = {
  target: TStateName;
  actions?: StateMachineActionList<TStateName, TContext>;
  cond?: StateMachineCondFunction<TStateName, TContext>;
};

export type StateMachineEmitObject<TStateName extends string, TEventType extends string, TContext extends object> = {
  eventType: TEventType;
  cond?: StateMachineCondFunction<TStateName, TContext>;
};

export type StateMachineState<TStateName extends string, TEventType extends string, TContext extends object> = {
  entry?: StateMachineActionList<TStateName, TContext>;
  job?: StateMachineJobFunction<TContext>;
  exit?: StateMachineActionList<TStateName, TContext>;
  on?: PartialOneRecord<TEventType, NonEmptyArray<StateMachineTransitionObject<TStateName, TContext>>>;
  emit?: NonEmptyArray<StateMachineEmitObject<TStateName, TEventType, TContext>>;
};

export type StateMachineConfig<TStateName extends string, TEventType extends string, TContext extends object> = {
  initState: NoInfer<TStateName>;
  context: TContext;
  states: Record<TStateName, StateMachineState<NoInfer<TStateName>, NoInfer<TEventType>, NoInfer<TContext>>>;
};

export type StateMachineErrorMessages = {
  getAlreadyStartedMessage?: () => string;
  getRestartNotAllowedMessage?: () => string;
  getCannotSendIfNotStartedMessage?: () => string;
  getCannotSendWhenStoppedMessage?: () => string;
  getUnsupportedTransitionsMessage?: (stateName: string) => string;
  getInvalidEventTypeMessage?: (stateName: string, eventType: string) => string;
  getNoTransitionObjectMessage?: (stateName: string, eventType: string) => string;
  getActionTimeLimitExceededMessage?: (stateName: string, errorDelay: number) => string;
};

export type StateMachineOptions = {
  timeForWork?: number;
  errorMessages?: StateMachineErrorMessages;
};

export type StateMachineEventData<TStateName extends string, TContext extends object> = {
  context: TContext;
  stateName: TStateName;
};

export type StateMachineTransitionEventData<TStateName extends string, TEventType extends string, TContext extends object> = {
  context: TContext;
  stateName: TStateName;
  nextStateName: TStateName;
  eventType: TEventType;
};

export type StateMachineStatus = (typeof fsmStatuses)[keyof typeof fsmStatuses];

export interface IStateMachine<TStateName extends string, TEventType extends string, TContext extends object> {
  get stateName(): TStateName;
  get status(): StateMachineStatus;
  getContext(): TContext;
  start(): void;
  stop(): void;
  send(eventType: TEventType): void;
}

export interface StateMachineEvents<TStateName extends string, TEventType extends string, TContext extends object> {
  start: [eventData: StateMachineEventData<TStateName, TContext>, fsm: IStateMachine<TStateName, TEventType, TContext>];
  entry: [eventData: StateMachineEventData<TStateName, TContext>, fsm: IStateMachine<TStateName, TEventType, TContext>];
  job: [eventData: StateMachineEventData<TStateName, TContext>, fsm: IStateMachine<TStateName, TEventType, TContext>];
  pending: [eventData: StateMachineEventData<TStateName, TContext>, fsm: IStateMachine<TStateName, TEventType, TContext>];
  transition: [eventData: StateMachineTransitionEventData<TStateName, TEventType, TContext>, fsm: IStateMachine<TStateName, TEventType, TContext>];
  exit: [eventData: StateMachineEventData<TStateName, TContext>, fsm: IStateMachine<TStateName, TEventType, TContext>];
  finish: [eventData: StateMachineEventData<TStateName, TContext>, fsm: IStateMachine<TStateName, TEventType, TContext>];
  stop: [eventData: StateMachineEventData<TStateName, TContext>, fsm: IStateMachine<TStateName, TEventType, TContext>];
  error: [error: Error, eventData: StateMachineEventData<TStateName, TContext>, fsm: IStateMachine<TStateName, TEventType, TContext>];
}
