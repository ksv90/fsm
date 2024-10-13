export const enum StatusesFSM {
  notStarted,
  active,
  stopped,
}

export interface IFiniteStateMachine<TStateName extends string, TEventType extends string, TContext extends object> {
  get stateName(): TStateName;
  get status(): StatusesFSM;
  getContext(): TContext;
  start(): void;
  stop(): void;
  send(eventType: TEventType): void;
}

export type NonEmptyArray<T> = [T, ...T[]];

export type PartialOneRecord<K extends PropertyKey, V> = Partial<Record<K, V>> & { [P in K]: Required<Pick<Record<K, V>, P>> }[K];

export type StateDataАЫЬ<TStateName extends string> = {
  stateName: TStateName;
};

export type CondFuncFSM<TStateName extends string, TContext extends object> = (context: TContext, stateData: StateDataАЫЬ<TStateName>) => boolean;

export type CompleteFuncFSM = () => void;

export type JobFuncFSM<TContext extends object> = (context: TContext, complete: CompleteFuncFSM) => void | Promise<void>;

export type ActionFuncFSM<TStateName extends string, TContext extends object> = (context: TContext, stateData: StateDataАЫЬ<TStateName>) => void;

export type ActionListFSM<TStateName extends string, TContext extends object> = NonEmptyArray<ActionFuncFSM<TStateName, TContext>>;

export type TransitionObjectFSM<TStateName extends string, TContext extends object> = {
  target: TStateName;
  actions?: ActionListFSM<TStateName, TContext>;
  cond?: CondFuncFSM<TStateName, TContext>;
};

export type EmitObjectFSM<TStateName extends string, TEventType extends string, TContext extends object> = {
  eventType: TEventType;
  cond?: CondFuncFSM<TStateName, TContext>;
};

export type StateFSM<TStateName extends string, TEventType extends string, TContext extends object> = {
  entry?: ActionListFSM<TStateName, TContext>;
  job?: JobFuncFSM<TContext>;
  exit?: ActionListFSM<TStateName, TContext>;
  on?: PartialOneRecord<TEventType, NonEmptyArray<TransitionObjectFSM<TStateName, TContext>>>;
  emit?: NonEmptyArray<EmitObjectFSM<TStateName, TEventType, TContext>>;
};

export type ConfigFSM<TStateName extends string, TEventType extends string, TContext extends object> = {
  initState: NoInfer<TStateName>;
  context: TContext;
  states: Record<TStateName, StateFSM<NoInfer<TStateName>, NoInfer<TEventType>, NoInfer<TContext>>>;
};

export type CustomErrorMessagesFSM = {
  getAlreadyStartedMessage?: () => string;
  getRestartNotAllowedMessage?: () => string;
  getCannotSendIfNotStartedMessage?: () => string;
  getCannotSendWhenStoppedMessage?: () => string;
  getUnsupportedTransitionsMessage?: (stateName: string) => string;
  getInvalidEventTypeMessage?: (stateName: string, eventType: string) => string;
  getNoTransitionObjectMessage?: (stateName: string, eventType: string) => string;
  getActionTimeLimitExceededMessage?: (stateName: string, errorDelay: number) => string;
};

export type OptionsFSM = {
  timeForWork?: number;
  errorMessages?: CustomErrorMessagesFSM;
};

export type EventDataFSM<TStateName extends string, TContext extends object> = {
  context: TContext;
  stateName: TStateName;
};

export type TransitionEventData<TStateName extends string, TEventType extends string, TContext extends object> = {
  context: TContext;
  stateName: TStateName;
  nextStateName: TStateName;
  eventType: TEventType;
};

export type EventsFSM<TStateName extends string, TEventType extends string, TContext extends object> = {
  start: [eventData: EventDataFSM<TStateName, TContext>, fsm: IFiniteStateMachine<TStateName, TEventType, TContext>];
  entry: [eventData: EventDataFSM<TStateName, TContext>, fsm: IFiniteStateMachine<TStateName, TEventType, TContext>];
  job: [eventData: EventDataFSM<TStateName, TContext>, fsm: IFiniteStateMachine<TStateName, TEventType, TContext>];
  pending: [eventData: EventDataFSM<TStateName, TContext>, fsm: IFiniteStateMachine<TStateName, TEventType, TContext>];
  transition: [eventData: TransitionEventData<TStateName, TEventType, TContext>, fsm: IFiniteStateMachine<TStateName, TEventType, TContext>];
  exit: [eventData: EventDataFSM<TStateName, TContext>, fsm: IFiniteStateMachine<TStateName, TEventType, TContext>];
  finish: [eventData: EventDataFSM<TStateName, TContext>, fsm: IFiniteStateMachine<TStateName, TEventType, TContext>];
  stop: [eventData: EventDataFSM<TStateName, TContext>, fsm: IFiniteStateMachine<TStateName, TEventType, TContext>];
  error: [error: Error, eventData: EventDataFSM<TStateName, TContext>, fsm: IFiniteStateMachine<TStateName, TEventType, TContext>];
};
