import { StateMachine } from 'src/fsm';
import { describe, expect, it, vi } from 'vitest';

describe('StateMachine basic functionality', () => {
  it('should throw an error when starting an already active StateMachine', () => {
    const fsm = new StateMachine({ initState: 'idle', context: {}, states: { idle: { on: { NEXT: [{ target: 'idle' }] } } } });
    fsm.start();
    expect(() => fsm.start()).toThrowError('StateMachine is already started');
  });

  it('should throw an error when trying to terminate a stopped StateMachine', () => {
    const fsm = new StateMachine({ initState: 'idle', context: {}, states: { idle: { on: { NEXT: [{ target: 'idle' }] } } } });
    fsm.stop();
    expect(() => fsm.stop()).toThrowError('StateMachine is already stopped');
  });

  it('should start the  StateMachine successfully', () => {
    const fsm = new StateMachine({ initState: 'idle', context: {}, states: { idle: { on: { NEXT: [{ target: 'idle' }] } } } });
    expect(fsm.started).toBe(false);
    fsm.start();
    expect(fsm.started).toBe(true);
  });

  it('should stop the  StateMachine successfully', () => {
    const fsm = new StateMachine({ initState: 'idle', context: {}, states: { idle: { on: { NEXT: [{ target: 'idle' }] } } } });
    fsm.start();
    fsm.stop();
    expect(fsm.started).toBe(false);
    expect(fsm.stopped).toBe(true);
  });

  it('should stop the not running fsm', () => {
    const fsm = new StateMachine({ initState: 'idle', context: {}, states: { idle: {} } });
    expect(fsm.stopped).toBe(false);
    fsm.stop();
    expect(fsm.stopped).toBe(true);
  });

  it('should transition to another state on a valid event', () => {
    const fsm = new StateMachine({
      initState: 'idle',
      context: {},
      states: {
        idle: { on: { START: [{ target: 'running' }] } },
        running: {},
      },
    });
    fsm.start();
    fsm.transition('START');
    expect(fsm.stateName).toBe('running');
  });

  it('should throw an error on unsupported event', () => {
    const fsm = new StateMachine({
      initState: 'idle',
      context: {},
      states: { idle: { on: { NEXT: [{ target: 'running' }] } }, running: { on: { INVALID_EVENT: [{ target: 'idle' }] } } },
    });
    fsm.start();
    const handler = vi.fn((error: Error) => {
      expect(error.message).toBe('Event type "INVALID_EVENT" is not valid for the current state "idle"');
    });
    fsm.on('error', handler);
    fsm.transition('INVALID_EVENT');
    expect(handler).toHaveBeenCalled();
  });

  it('should handle conditional transition correctly', () => {
    const fsm = new StateMachine({
      initState: 'idle',
      context: { canStart: true },
      states: {
        idle: {
          on: {
            START: [{ target: 'running', cond: (context) => context.canStart }],
          },
        },
        running: {},
      },
    });
    fsm.start();
    fsm.transition('START');
    expect(fsm.stateName).toBe('running');
  });

  it('should process asynchronous action correctly', async () => {
    const job = vi.fn<[unknown]>((_) => setTimeout(() => undefined, 100));
    const fsm = new StateMachine({
      initState: 'idle',
      context: {},
      states: {
        idle: {
          job,
          on: { NEXT_EVENT: [{ target: 'running' }] },
          emit: [{ eventType: 'NEXT_EVENT' }],
        },
        running: {},
      },
    });
    fsm.start();
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(fsm.stateName).toBe('running');
    expect(job).toHaveBeenCalled();
  });

  it('should reach final state and stop  StateMachine', () => {
    const fsm = new StateMachine({
      initState: 'idle',
      context: {},
      states: {
        idle: { on: { FINISH: [{ target: 'completed' }] } },
        completed: {},
      },
    });
    fsm.start();
    fsm.transition('FINISH');
    expect(fsm.stopped).toBe(true);
  });
});
