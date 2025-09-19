import { Emitter, type IEmitter } from '@ksv90/decorators';

import { errorCodes, statuses } from './constants';
import { StateMachineError } from './error';
import type {
  IStateMachine,
  StateMachineActionFunction,
  StateMachineCompleteFunction,
  StateMachineConfig,
  StateMachineEvents,
  StateMachineOptions,
  StateMachineState,
} from './types';

export interface StateMachine<TStateName extends string, TEventType extends string, TContext extends object>
  extends IEmitter<StateMachineEvents<TStateName, TEventType, TContext, StateMachine<TStateName, TEventType, TContext>>> {}

export
@Emitter()
class StateMachine<TStateName extends string, TEventType extends string, TContext extends object>
  implements IStateMachine<TStateName, TEventType, TContext>
{
  #status: (typeof statuses)[keyof typeof statuses] = statuses.NOT_STARTED;

  #stateName: TStateName;

  #stateId: object; // the object reference satisfies the requirements for id

  readonly #options: StateMachineOptions;

  readonly #context: TContext;

  readonly #stateList: Record<TStateName, StateMachineState<TStateName, TEventType, TContext>>;

  readonly #actionHandler = (action: StateMachineActionFunction<TStateName, TContext>): void => {
    try {
      action(this.#context, { stateName: this.#stateName });
    } catch (error) {
      this.#sendError(error);
    }
  };

  readonly #sendError = (error: unknown): void => {
    if (this.isStopped()) return;
    let stateMachineError: StateMachineError;
    if (error instanceof StateMachineError) {
      stateMachineError = error;
    } else if (error instanceof Error) {
      stateMachineError = new StateMachineError(errorCodes.RUNTIME_ERROR, error.message, { cause: error });
    } else if (typeof error === 'string') {
      stateMachineError = new StateMachineError(errorCodes.RUNTIME_ERROR, error);
    } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      stateMachineError = new StateMachineError(errorCodes.RUNTIME_ERROR, error.message);
    } else {
      stateMachineError = new StateMachineError(errorCodes.RUNTIME_ERROR, 'unknown error');
    }
    this.emit('error', stateMachineError, { context: this.#context, stateName: this.#stateName }, this);
    if (this.#options.stopOnError && !this.isStopped()) this.stop();
  };

  constructor(config: StateMachineConfig<TStateName, TEventType, TContext>, options: StateMachineOptions = {}) {
    this.#stateName = config.initState;
    this.#context = config.context;
    this.#stateList = config.states;
    this.#stateId = {};
    this.#options = { maxJobTime: options.maxJobTime ?? 5000, stopOnError: options.stopOnError ?? true, jobTimer: options.jobTimer };
  }

  get stateName(): TStateName {
    return this.#stateName;
  }

  isStarted(): boolean {
    return this.#status === statuses.ACTIVE;
  }

  isStopped(): boolean {
    return this.#status === statuses.STOPPED;
  }

  getContext(): TContext {
    return this.#context;
  }

  getStates(): Record<TStateName, StateMachineState<TStateName, TEventType, TContext>> {
    return this.#stateList;
  }

  hasEventType(eventType: TEventType): boolean {
    const [stateName, stateList] = [this.#stateName, this.#stateList];
    const currentState = stateList[stateName];
    if (!currentState.on) return false;
    return !!currentState.on[eventType];
  }

  start(): void {
    switch (this.#status) {
      case statuses.ACTIVE: {
        this.stop();
        throw new Error(`${this.constructor.name} is already started`);
      }
      case statuses.STOPPED: {
        throw new Error(`Cannot restart a stopped ${this.constructor.name}`);
      }
    }
    const [stateName, context] = [this.#stateName, this.#context];
    const currentState = this.#stateList[stateName];
    this.#status = statuses.ACTIVE;
    this.emit('start', { context, stateName }, this);
    this.emit('entry', { context, stateName }, this);
    currentState.entry?.forEach(this.#actionHandler);
    this.#runJob();
  }

  stop(): void {
    if (this.isStopped()) {
      throw new Error(`${this.constructor.name} is already stopped`);
    }
    this.#status = statuses.STOPPED;
    this.emit('stop', { context: this.#context, stateName: this.#stateName }, this);
    this.removeAllListeners();
  }

  transition(eventType: TEventType): void {
    const [stateName, stateList, context] = [this.#stateName, this.#stateList, this.#context];
    const currentState = stateList[stateName];

    switch (this.#status) {
      case statuses.NOT_STARTED: {
        this.stop();
        throw new Error(`Cannot transition events to an ${this.constructor.name} that is not started`);
      }
      case statuses.STOPPED: {
        throw new Error(`Cannot transition events to a stopped ${this.constructor.name}`);
      }
    }

    if (!currentState.on) {
      const message = `State "${stateName}" does not support any transitions`;
      const stateMachineError = new StateMachineError(errorCodes.UNSUPPORTED_TRANSITIONS, message);
      this.#sendError(stateMachineError);
      return;
    }

    const transitionObjects = currentState.on[eventType];

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!transitionObjects) {
      const message = `Event type "${eventType}" is not valid for the current state "${stateName}"`;
      const stateMachineError = new StateMachineError(errorCodes.INVALID_EVENT_TYPE, message);
      this.#sendError(stateMachineError);
      return;
    }

    const transitionObject = transitionObjects.find(({ cond }) => cond?.(context, { stateName }) ?? true);

    if (!transitionObject) {
      const message = `No transition object found for event type "${eventType}" in state "${stateName}"`;
      const stateMachineError = new StateMachineError(errorCodes.NO_TRANSITION_OBJECT, message);
      this.#sendError(stateMachineError);
      return;
    }

    if (!transitionObject.target) {
      transitionObject.actions?.forEach(this.#actionHandler);
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

    this.#runJob();
  }

  #runJob(): void {
    const [context, stateName, stateId] = [this.#context, this.#stateName, this.#stateId];
    const currentState = this.#stateList[this.#stateName];

    const complete: StateMachineCompleteFunction = (error) => {
      if (error) {
        this.#sendError(error);
        return;
      }

      if (this.isStopped()) return;
      if (this.#stateId !== stateId) return;

      const emitObject = currentState.emit?.find(({ cond }) => cond?.(context, { stateName }) ?? true);
      if (emitObject?.eventType) {
        this.transition(emitObject.eventType);
        return;
      }

      if (currentState.on) {
        this.emit('pending', { context, stateName }, this);
      } else {
        if (this.isStopped()) return;
        this.emit('finish', { context, stateName }, this);
        this.stop();
      }
    };

    if (currentState.job) {
      this.emit('job', { context, stateName }, this);
      const clearTimer = this.#startTimer();
      try {
        currentState.job(context, complete);
      } catch (error) {
        this.#sendError(error);
      } finally {
        clearTimer();
      }
    } else {
      complete();
    }
  }

  #startTimer(): () => void {
    const stateName = this.#stateName;
    const { maxJobTime, jobTimer } = this.#options;

    let active = true;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    if (jobTimer) {
      jobTimer()
        .then(() => {
          if (!active) return;
          const message = `The job function in state '${stateName}' has exceeded the allowed time limit`;
          const error = new StateMachineError(errorCodes.JOB_TIME_LIMIT_EXCEEDED, message);
          this.#sendError(error);
        })
        .catch(this.#sendError);
    } else if (maxJobTime && maxJobTime > 0) {
      timerId = setTimeout(() => {
        const message = `The job function in state '${stateName}' has exceeded the allowed time limit of ${String(maxJobTime)} ms`;
        const error = new StateMachineError(errorCodes.JOB_TIME_LIMIT_EXCEEDED, message);
        this.#sendError(error);
      }, maxJobTime);
    }

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
    };
  }
}
