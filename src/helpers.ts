import type { StateMachineJobFunction } from './types';

export const createJob = <TContext extends object>(job: StateMachineJobFunction<TContext>, context: TContext) => {
  return new Promise<void>((resolve, reject) => {
    try {
      const result = job(context, resolve);
      if (result instanceof Promise) {
        if (job.length < 2) result.then(resolve).catch(reject);
        else result.catch(reject);
      } else {
        if (job.length < 2) resolve();
      }
    } catch (error) {
      reject(error);
    }
  });
};
