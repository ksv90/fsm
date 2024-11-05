import { errorCodes } from './constants';

export { errorCodes as stateMachineErrorCodes };

export type StateMachineErrorCodes = (typeof errorCodes)[keyof typeof errorCodes];

export class StateMachineError extends Error {
  #code: StateMachineErrorCodes;

  constructor(code: StateMachineErrorCodes, message?: string, options?: ErrorOptions) {
    super(message, options);
    this.#code = code;
  }

  get code(): StateMachineErrorCodes {
    return this.#code;
  }
}
