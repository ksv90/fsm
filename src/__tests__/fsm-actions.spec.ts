import { StateMachineConfig } from 'src/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StateMachine } from '../fsm';

type StateName = 'idle' | 'active' | 'stopped';
type EventType = 'START' | 'STOP' | 'PAUSE';
type Context = { count: number };

function createFSM(): StateMachineConfig<StateName, EventType, Context> {
  return {
    initState: 'idle',
    context: { count: 0 },
    states: {
      idle: {
        on: {
          START: [
            {
              target: 'active',
              actions: [
                (context) => {
                  context.count += 1;
                },
              ],
            },
          ],
        },
      },
      active: {
        on: {
          STOP: [
            {
              target: 'stopped',
              actions: [
                async (context) => {
                  await new Promise((r) => setTimeout(r, 100));
                  context.count -= 1;
                },
              ],
            },
          ],
        },
      },
      stopped: {},
    },
  };
}

describe('StateMachine actions', () => {
  let fsm: StateMachine<StateName, EventType, Context>;
  let fsmConfig: StateMachineConfig<StateName, EventType, Context>;

  beforeEach(() => {
    fsmConfig = createFSM();
    fsm = new StateMachine(fsmConfig);
    fsm.start();
  });

  it('synchronous action execution', () => {
    // Отправляем событие, которое триггерит синхронное действие
    fsm.send('START');

    // Проверяем, что состояние изменилось на 'active'
    expect(fsm.stateName).toBe('active');

    // Проверяем, что контекст был изменен синхронно
    expect(fsm.getContext().count).toBe(1);
  });

  it('asynchronous action execution', async () => {
    fsm.send('START');
    fsm.send('STOP');

    // Подождем, чтобы асинхронное действие выполнилось
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Проверяем, что состояние изменилось на 'stopped'
    expect(fsm.stateName).toBe('stopped');

    // Проверяем, что контекст был изменен асинхронно
    expect(fsm.getContext().count).toBe(0);
  });

  it('synchronous action call count', () => {
    const syncActionSpy = vi.fn((context: Context) => {
      context.count += 1;
    });

    // Модифицируем конфигурацию для использования spy
    fsmConfig.states.idle.on = { START: [{ target: 'active', actions: [syncActionSpy] }] };

    fsm.send('START');

    expect(syncActionSpy).toHaveBeenCalledOnce();
  });

  it('asynchronous action call count', async () => {
    const asyncActionSpy = vi.fn(async (context: Context) => {
      await new Promise((r) => setTimeout(r, 100));
      context.count -= 1;
    });

    // Модифицируем конфигурацию для использования spy
    fsmConfig.states.active.on = { STOP: [{ target: 'stopped', actions: [asyncActionSpy] }] };

    fsm.send('START');
    fsm.send('STOP');

    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(asyncActionSpy).toHaveBeenCalledOnce();
  });
});
