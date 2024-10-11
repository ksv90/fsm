import { Emitter, IEmitter } from '@ksv90/decorators';

import { createJob } from './helpers';
import { ActionFuncFSM, ConfigFSM, EventsFSM, IFiniteStateMachine, OptionsFSM, StateFSM, StatusesFSM } from './types';

export interface FiniteStateMachine<TStateName extends string, TEventType extends string, TContext extends object>
  extends IEmitter<EventsFSM<TStateName, TEventType, TContext>> {}

export
@Emitter()
class FiniteStateMachine<TStateName extends string, TEventType extends string, TContext extends object>
  implements IFiniteStateMachine<TStateName, TEventType, TContext>
{
  #status: StatusesFSM = StatusesFSM.notStarted;

  #stateName: TStateName;

  #stateId: object; // the object reference satisfies the requirements for id

  readonly #options: OptionsFSM;

  readonly #context: TContext;

  readonly #stateList: Record<TStateName, StateFSM<TStateName, TEventType, TContext>>;

  readonly #jobs = new Set<Promise<void>>();

  readonly #actionHandler = (action: ActionFuncFSM<TStateName, TEventType, TContext>): void => action(this.#context, this);

  readonly #sendError = (error: unknown): Error => {
    let errorInstance: Error;
    if (error instanceof Error) errorInstance = error;
    else if (typeof error === 'string') errorInstance = new Error(error);
    else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') errorInstance = new Error(error.message);
    else errorInstance = new Error('unknown error');
    if (this.#status !== StatusesFSM.stopped) {
      this.emit('error', errorInstance, this.#context, this);
      this.stop();
    }
    return errorInstance;
  };

  constructor(config: ConfigFSM<TStateName, TEventType, TContext>, options?: OptionsFSM) {
    this.#stateName = config.initState;
    this.#context = config.context;
    this.#stateList = config.states;
    this.#options = { timeForWork: options?.timeForWork ?? 5000 };
    this.#stateId = {};
  }

  get status(): StatusesFSM {
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
      case StatusesFSM.active: {
        const message = this.#options.errorMessages?.getAlreadyStartedMessage?.();
        this.#sendError(message ?? 'FSM is already started');
        return;
      }
      case StatusesFSM.stopped: {
        const message = this.#options.errorMessages?.getRestartNotAllowedMessage?.();
        this.#sendError(message ?? 'Cannot restart a stopped FSM');
        return;
      }
    }
    const [stateName, context] = [this.#stateName, this.#context];
    const currentState = this.#stateList[stateName];
    this.#status = StatusesFSM.active;
    this.emit('start', context, this);
    this.emit('entry', context, this);
    currentState.entry?.forEach(this.#actionHandler);
    this.#runJob().catch(this.#sendError);
  }

  stop(): void {
    try {
      switch (this.#status) {
        case StatusesFSM.notStarted: {
          const message = this.#options.errorMessages?.getStopNotAllowedMessage?.();
          throw new Error(message ?? 'Cannot stop an FSM that is not started');
        }
        case StatusesFSM.stopped: {
          const message = this.#options.errorMessages?.getAlreadyStoppedMessage?.();
          throw new Error(message ?? 'FSM is already stopped');
        }
      }
    } catch (error) {
      this.emit('error', error as Error, this.#context, this);
    }
    this.#status = StatusesFSM.stopped;
    this.emit('stop', this.#context, this);
    this.removeAllListeners();
  }

  send(eventType: TEventType): void {
    const [stateName, stateList, context] = [this.#stateName, this.#stateList, this.#context];
    const currentState = stateList[stateName];

    switch (this.#status) {
      case StatusesFSM.notStarted: {
        const message = this.#options.errorMessages?.getCannotSendIfNotStartedMessage?.();
        this.#sendError(message ?? 'Cannot send events to an FSM that is not started');
        return;
      }
      case StatusesFSM.stopped: {
        const message = this.#options.errorMessages?.getCannotSendWhenStoppedMessage?.();
        this.#sendError(message ?? 'Cannot send events to a stopped FSM');
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

    const transitionObject = transitionObjects.find(({ cond }) => cond?.(context, this) ?? true);

    if (!transitionObject) {
      const message = this.#options.errorMessages?.getNoTransitionObjectMessage?.(stateName, eventType);
      this.#sendError(message ?? `No transition object found for event type "${eventType}" in state "${stateName}"`);
      return;
    }

    const nextStateName = transitionObject.target;
    const nextState = stateList[nextStateName];

    this.emit('exit', context, this);
    currentState.exit?.forEach(this.#actionHandler);
    this.emit('transition', context, { prevStateName: stateName, nextStateName, eventType }, this);
    transitionObject.actions?.forEach(this.#actionHandler);
    this.emit('entry', context, this);
    nextState.entry?.forEach(this.#actionHandler);

    this.#stateName = nextStateName;
    this.#stateId = {};
    this.#runJob().catch(this.#sendError);
  }

  async #runJob(): Promise<void> {
    const [context, stateId] = [this.#context, this.#stateId];
    const currentState = this.#stateList[this.#stateName];

    if (currentState.job) {
      this.emit('job', context, this);
      const timerId = this.#startTimer();
      const job = createJob(currentState.job, context);
      this.#jobs.add(job);
      await job;
      this.#jobs.delete(job);
      if (timerId) clearTimeout(timerId);
    }

    if (this.#status === StatusesFSM.stopped) return;
    if (this.#stateId !== stateId) return;

    const emitObject = currentState.emit?.find(({ cond }) => cond?.(context, this) ?? true);
    if (emitObject?.eventType) return this.send(emitObject.eventType);

    if (currentState.on) {
      this.emit('pending', context, this);
    } else {
      if (this.#jobs.size) await Promise.all(this.#jobs.values());
      if (this.#status !== StatusesFSM.active) return;
      this.emit('finish', context, this);
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
      return;
    }, timeForWork);
  }
}
