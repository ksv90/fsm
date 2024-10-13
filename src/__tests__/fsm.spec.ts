import { describe, expect, it, vi } from 'vitest';

import { FiniteStateMachine } from '../fsm';
import { StatusesFSM } from '../types';

describe('FiniteStateMachine basic functionality', () => {
  it('should start the FSM successfully', () => {
    const fsm = new FiniteStateMachine({ initState: 'idle', context: {}, states: { idle: { on: { NEXT: [{ target: 'idle' }] } } } });
    fsm.start();
    expect(fsm.status).toBe(StatusesFSM.active);
  });

  it('should throw an error when starting an already active FSM', () => {
    const fsm = new FiniteStateMachine({ initState: 'idle', context: {}, states: { idle: { on: { NEXT: [{ target: 'idle' }] } } } });
    const handler = vi.fn<[Error]>((error) => {
      expect(error.message).toBe('FSM is already started');
    });
    fsm.on('error', handler);
    fsm.start();
    fsm.start();
    expect(handler).toHaveBeenCalled();
  });

  it('should stop the FSM successfully', () => {
    const fsm = new FiniteStateMachine({ initState: 'idle', context: {}, states: { idle: { on: { NEXT: [{ target: 'idle' }] } } } });
    fsm.start();
    fsm.stop();
    expect(fsm.status).toBe(StatusesFSM.stopped);
  });

  it('should stop the not running fsm', () => {
    const fsm = new FiniteStateMachine({ initState: 'idle', context: {}, states: { idle: {} } });
    fsm.stop();
    expect(fsm.status).toBe(StatusesFSM.stopped);
  });

  it('should transition to another state on a valid event', () => {
    const fsm = new FiniteStateMachine({
      initState: 'idle',
      context: {},
      states: {
        idle: { on: { START: [{ target: 'running' }] } },
        running: {},
      },
    });
    fsm.start();
    fsm.send('START');
    expect(fsm.stateName).toBe('running');
  });

  it('should throw an error on unsupported event', () => {
    const fsm = new FiniteStateMachine({
      initState: 'idle',
      context: {},
      states: { idle: { on: { NEXT: [{ target: 'running' }] } }, running: { on: { INVALID_EVENT: [{ target: 'idle' }] } } },
    });
    fsm.start();
    const handler = vi.fn<[Error]>((error) => {
      expect(error.message).toBe('Event type "INVALID_EVENT" is not valid for the current state "idle"');
    });
    fsm.on('error', handler);
    fsm.send('INVALID_EVENT');
    expect(handler).toHaveBeenCalled();
  });

  it('should handle conditional transition correctly', () => {
    const fsm = new FiniteStateMachine({
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
    fsm.send('START');
    expect(fsm.stateName).toBe('running');
  });

  it('should process asynchronous action correctly', async () => {
    const job = vi.fn<[unknown]>((_) => setTimeout(() => undefined, 100));
    const fsm = new FiniteStateMachine({
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

  it('should reach final state and stop FSM', () => {
    const fsm = new FiniteStateMachine({
      initState: 'idle',
      context: {},
      states: {
        idle: { on: { FINISH: [{ target: 'completed' }] } },
        completed: {},
      },
    });
    fsm.start();
    fsm.send('FINISH');
    expect(fsm.status).toBe(StatusesFSM.stopped);
  });
});
