import type { StateMachineError } from './error';

type NonEmptyArray<T> = [T, ...T[]];

type PartialOneRecord<K extends PropertyKey, V> = Partial<Record<K, V>> & { [P in K]: Required<Pick<Record<K, V>, P>> }[K];

export interface StateMachineStateData<TStateName extends string> {
  stateName: TStateName;
}

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

export interface StateMachineTransitionObject<TStateName extends string, TContext extends object> {
  target: TStateName;
  actions?: StateMachineActionList<TStateName, TContext>;
  cond?: StateMachineCondFunction<TStateName, TContext>;
}

export interface StateMachineEmitObject<TStateName extends string, TEventType extends string, TContext extends object> {
  eventType: TEventType;
  cond?: StateMachineCondFunction<TStateName, TContext>;
}

export interface StateMachineState<TStateName extends string, TEventType extends string, TContext extends object> {
  entry?: StateMachineActionList<TStateName, TContext>;
  job?: StateMachineJobFunction<TContext>;
  exit?: StateMachineActionList<TStateName, TContext>;
  on?: PartialOneRecord<TEventType, NonEmptyArray<StateMachineTransitionObject<TStateName, TContext>>>;
  emit?: NonEmptyArray<StateMachineEmitObject<TStateName, TEventType, TContext>>;
}

export interface StateMachineConfig<TStateName extends string, TEventType extends string, TContext extends object> {
  initState: NoInfer<TStateName>;
  context: TContext;
  states: Record<TStateName, StateMachineState<NoInfer<TStateName>, NoInfer<TEventType>, NoInfer<TContext>>>;
}

export interface StateMachineOptions {
  maxJobTime?: number;
  stopOnError?: boolean;
  jobTimer?: () => Promise<void>;
}

export interface StateMachineEventData<TStateName extends string, TContext extends object> {
  context: TContext;
  stateName: TStateName;
}

export interface StateMachineTransitionEventData<TStateName extends string, TEventType extends string, TContext extends object> {
  context: TContext;
  stateName: TStateName;
  nextStateName: TStateName;
  eventType: TEventType;
}

export interface IStateMachine<TStateName extends string, TEventType extends string, TContext extends object> {
  get stateName(): TStateName;
  get activeJobs(): number;
  isStarted(): boolean;
  isStopped(): boolean;
  getContext(): TContext;
  getStates(): Record<TStateName, StateMachineState<TStateName, TEventType, TContext>>;
  hasEventType(eventType: TEventType): boolean;
  start(): void;
  stop(): void;
  transition(eventType: TEventType): void;
}

export interface StateMachineEvents<
  TStateName extends string,
  TEventType extends string,
  TContext extends object,
  TStateMachine extends IStateMachine<TStateName, TEventType, TContext>,
> {
  start: [eventData: StateMachineEventData<TStateName, TContext>, fsm: TStateMachine];
  entry: [eventData: StateMachineEventData<TStateName, TContext>, fsm: TStateMachine];
  job: [eventData: StateMachineEventData<TStateName, TContext>, fsm: TStateMachine];
  pending: [eventData: StateMachineEventData<TStateName, TContext>, fsm: TStateMachine];
  transition: [eventData: StateMachineTransitionEventData<TStateName, TEventType, TContext>, fsm: TStateMachine];
  exit: [eventData: StateMachineEventData<TStateName, TContext>, fsm: TStateMachine];
  finish: [eventData: StateMachineEventData<TStateName, TContext>, fsm: TStateMachine];
  stop: [eventData: StateMachineEventData<TStateName, TContext>, fsm: TStateMachine];
  error: [error: StateMachineError, eventData: StateMachineEventData<TStateName, TContext>, fsm: TStateMachine];
}
