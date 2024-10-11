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

export type CondFuncFSM<TStateName extends string, TEventType extends string, TContext extends object> = (
  ctx: TContext,
  fsm: IFiniteStateMachine<TStateName, TEventType, TContext>,
) => boolean;

export type CompleteFuncFSM = () => void;

export type JobFuncFSM<TContext extends object> = (ctx: TContext, complete: CompleteFuncFSM) => void | Promise<void>;

export type ActionFuncFSM<TStateName extends string, TEventType extends string, TContext extends object> = (
  ctx: TContext,
  fsm: IFiniteStateMachine<TStateName, TEventType, TContext>,
) => void;

export type ActionListFSM<TStateName extends string, TEventType extends string, TContext extends object> = NonEmptyArray<
  ActionFuncFSM<TStateName, TEventType, TContext>
>;

export type TransitionObjectFSM<TStateName extends string, TEventType extends string, TContext extends object> = {
  target: TStateName;
  actions?: ActionListFSM<TStateName, TEventType, TContext>;
  cond?: CondFuncFSM<TStateName, TEventType, TContext>;
};

export type EmitObjectFSM<TStateName extends string, TEventType extends string, TContext extends object> = {
  eventType: TEventType;
  cond?: CondFuncFSM<TStateName, TEventType, TContext>;
};

export type StateFSM<TStateName extends string, TEventType extends string, TContext extends object> = {
  entry?: ActionListFSM<TStateName, TEventType, TContext>;
  job?: JobFuncFSM<TContext>;
  exit?: ActionListFSM<TStateName, TEventType, TContext>;
  on?: PartialOneRecord<TEventType, NonEmptyArray<TransitionObjectFSM<TStateName, TEventType, TContext>>>;
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
  getStopNotAllowedMessage?: () => string;
  getAlreadyStoppedMessage?: () => string;
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

export type TransitionEventData<TStateName extends string, TEventType extends string> = {
  prevStateName: TStateName;
  nextStateName: TStateName;
  eventType: TEventType;
};

export type EventsFSM<TStateName extends string, TEventType extends string, TContext extends object> = {
  start: [context: TContext, fsm: IFiniteStateMachine<TStateName, TEventType, TContext>];
  entry: [context: TContext, fsm: IFiniteStateMachine<TStateName, TEventType, TContext>];
  job: [context: TContext, fsm: IFiniteStateMachine<TStateName, TEventType, TContext>];
  pending: [context: TContext, fsm: IFiniteStateMachine<TStateName, TEventType, TContext>];
  transition: [context: TContext, TransitionEventData<TStateName, TEventType>, fsm: IFiniteStateMachine<TStateName, TEventType, TContext>];
  exit: [context: TContext, fsm: IFiniteStateMachine<TStateName, TEventType, TContext>];
  finish: [context: TContext, fsm: IFiniteStateMachine<TStateName, TEventType, TContext>];
  stop: [context: TContext, fsm: IFiniteStateMachine<TStateName, TEventType, TContext>];
  error: [Error, context: TContext, fsm: IFiniteStateMachine<TStateName, TEventType, TContext>];
};
