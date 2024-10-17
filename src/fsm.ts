import { Emitter, type IEmitter } from '@ksv90/decorators';

import { fsmStatuses } from './constants';
import { createJob } from './helpers';
import type {
  IStateMachine,
  StateMachineActionFunction,
  StateMachineConfig,
  StateMachineEvents,
  StateMachineOptions,
  StateMachineState,
  StateMachineStatus,
} from './types';

export interface StateMachine<TStateName extends string, TEventType extends string, TContext extends object>
  extends IEmitter<StateMachineEvents<TStateName, TEventType, TContext>> {}

export
@Emitter()
class StateMachine<TStateName extends string, TEventType extends string, TContext extends object>
  implements IStateMachine<TStateName, TEventType, TContext>
{
  #status: StateMachineStatus = fsmStatuses.notStarted;

  #stateName: TStateName;

  #stateId: object; // the object reference satisfies the requirements for id

  readonly #options: StateMachineOptions;

  readonly #context: TContext;

  readonly #stateList: Record<TStateName, StateMachineState<TStateName, TEventType, TContext>>;

  readonly #jobList = new Set<Promise<void>>();

  readonly #actionHandler = (action: StateMachineActionFunction<TStateName, TContext>): void => action(this.#context, { stateName: this.#stateName });

  readonly #sendError = (error: unknown): void => {
    if (this.#status === fsmStatuses.stopped) return;
    let errorInstance: Error;
    if (error instanceof Error) errorInstance = error;
    else if (typeof error === 'string') errorInstance = new Error(error);
    else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') errorInstance = new Error(error.message);
    else errorInstance = new Error('unknown error');
    this.emit('error', errorInstance, { context: this.#context, stateName: this.#stateName }, this);
    this.stop();
  };

  constructor(config: StateMachineConfig<TStateName, TEventType, TContext>, options?: StateMachineOptions) {
    this.#stateName = config.initState;
    this.#context = config.context;
    this.#stateList = config.states;
    this.#options = { timeForWork: options?.timeForWork ?? 5000 };
    this.#stateId = {};
  }

  get status(): StateMachineStatus {
    return this.#status;
  }

  get stateName(): TStateName {
    return this.#stateName;
  }

  getContext(): TContext {
    return this.#context;
  }

  start(): void {
    switch (this.#status) {
      case fsmStatuses.active: {
        const message = this.#options.errorMessages?.getAlreadyStartedMessage?.();
        this.#sendError(message ?? 'StateMachine is already started');
        return;
      }
      case fsmStatuses.stopped: {
        const message = this.#options.errorMessages?.getRestartNotAllowedMessage?.();
        this.#sendError(message ?? 'Cannot restart a stopped StateMachine');
        return;
      }
    }
    const [stateName, context] = [this.#stateName, this.#context];
    const currentState = this.#stateList[stateName];
    this.#status = fsmStatuses.active;
    this.emit('start', { context, stateName }, this);
    this.emit('entry', { context, stateName }, this);
    currentState.entry?.forEach(this.#actionHandler);
    this.#runJob().catch(this.#sendError);
  }

  stop(): void {
    if (this.#status === fsmStatuses.stopped) return;
    this.#status = fsmStatuses.stopped;
    this.emit('stop', { context: this.#context, stateName: this.#stateName }, this);
    this.removeAllListeners();
  }

  send(eventType: TEventType): void {
    const [stateName, stateList, context] = [this.#stateName, this.#stateList, this.#context];
    const currentState = stateList[stateName];

    switch (this.#status) {
      case fsmStatuses.notStarted: {
        const message = this.#options.errorMessages?.getCannotSendIfNotStartedMessage?.();
        this.#sendError(message ?? 'Cannot send events to an StateMachine that is not started');
        return;
      }
      case fsmStatuses.stopped: {
        const message = this.#options.errorMessages?.getCannotSendWhenStoppedMessage?.();
        this.#sendError(message ?? 'Cannot send events to a stopped StateMachine');
        return;
      }
    }

    if (!currentState.on) {
      const message = this.#options.errorMessages?.getUnsupportedTransitionsMessage?.(stateName);
      this.#sendError(message ?? `State "${stateName}" does not support any transitions`);
      return;
    }

    const transitionObjects = currentState.on[eventType];

    if (!transitionObjects) {
      const message = this.#options.errorMessages?.getInvalidEventTypeMessage?.(stateName, eventType);
      this.#sendError(message ?? `Event type "${eventType}" is not valid for the current state "${stateName}"`);
      return;
    }

    const transitionObject = transitionObjects.find(({ cond }) => cond?.(context, { stateName }) ?? true);

    if (!transitionObject) {
      const message = this.#options.errorMessages?.getNoTransitionObjectMessage?.(stateName, eventType);
      this.#sendError(message ?? `No transition object found for event type "${eventType}" in state "${stateName}"`);
      return;
    }

    const nextStateName = transitionObject.target;
    const nextState = stateList[nextStateName];

    this.emit('exit', { context, stateName }, this);
    currentState.exit?.forEach(this.#actionHandler);

    this.emit('transition', { context, stateName, nextStateName, eventType }, this);
    transitionObject.actions?.forEach(this.#actionHandler);

    this.#stateName = nextStateName;
    this.#stateId = {};
    this.emit('entry', { context, stateName: nextStateName }, this);
    nextState.entry?.forEach(this.#actionHandler);

    this.#runJob().catch(this.#sendError);
  }

  async #runJob(): Promise<void> {
    const [context, stateName, stateId] = [this.#context, this.#stateName, this.#stateId];
    const currentState = this.#stateList[this.#stateName];

    if (currentState.job) {
      this.emit('job', { context, stateName }, this);
      const timerId = this.#startTimer();
      const job = createJob(currentState.job, context);
      this.#jobList.add(job);
      await job;
      this.#jobList.delete(job);
      if (timerId) clearTimeout(timerId);
    }

    if (this.#status === fsmStatuses.stopped) return;
    if (this.#stateId !== stateId) return;

    const emitObject = currentState.emit?.find(({ cond }) => cond?.(context, { stateName }) ?? true);
    if (emitObject?.eventType) return this.send(emitObject.eventType);

    if (currentState.on) {
      this.emit('pending', { context, stateName }, this);
    } else {
      if (this.#jobList.size) await Promise.all(this.#jobList.values());
      if (this.#status !== fsmStatuses.active) return;
      this.emit('finish', { context, stateName }, this);
      this.stop();
    }
  }

  #startTimer(): ReturnType<typeof setTimeout> | null {
    const stateName = this.#stateName;
    const { timeForWork } = this.#options;
    if (!timeForWork) return null;
    return setTimeout(() => {
      const message = this.#options.errorMessages?.getActionTimeLimitExceededMessage?.(stateName, timeForWork);
      this.#sendError(message ?? `The job function in state '${stateName}' has exceeded the allowed time limit of ${timeForWork}ms`);
    }, timeForWork);
  }
}
