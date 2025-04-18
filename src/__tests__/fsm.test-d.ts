import { expectTypeOf, test } from 'vitest';

import { StateMachine } from '../fsm';
import { StateMachineActionList, StateMachineConfig, StateMachineState } from '../types';

type StateName = 'idle' | 'active' | 'stopped';
type EventType = 'START' | 'STOP' | 'PAUSE';

interface Context {
  count: number;
}

declare const fsmConfig: StateMachineConfig<StateName, EventType, Context>;
declare const fsm: StateMachine<StateName, EventType, Context>;

test('StateMachine types', () => {
  // Проверка типов состояния и статуса StateMachine
  expectTypeOf<typeof fsm.stateName>().toEqualTypeOf<StateName>();
  expectTypeOf<ReturnType<typeof fsm.isStarted>>().toEqualTypeOf<boolean>();

  // Проверка типа метода getContext
  expectTypeOf<typeof fsm.getContext>().returns.toEqualTypeOf<Context>();

  // Проверка методов start и stop
  expectTypeOf<typeof fsm.start>().returns.toBeVoid();
  expectTypeOf<typeof fsm.stop>().returns.toBeVoid();

  // Проверка метода transition
  expectTypeOf<typeof fsm.transition>().parameters.toEqualTypeOf<[EventType]>();
  expectTypeOf<typeof fsm.transition>().returns.toBeVoid();

  // Негативные проверки типов для события и состояния
  // @ts-expect-error: 'INVALID_EVENT' не является допустимым событием
  fsm.transition('INVALID_EVENT');
  // @ts-expect-error: 'invalid_state' не является допустимым состоянием
  expectTypeOf<typeof fsm.stateName>().toEqualTypeOf<'invalid_state'>();
});

test('ConfigFSM types', () => {
  // Проверка типа конфигурации StateMachine
  expectTypeOf(fsmConfig).toMatchTypeOf<StateMachineConfig<StateName, EventType, Context>>();

  // Проверка типа начального состояния и контекста
  expectTypeOf(fsmConfig.initState).toEqualTypeOf<StateName>();
  expectTypeOf(fsmConfig.context).toMatchTypeOf<Context>();

  // Проверка типов состояний StateMachine
  expectTypeOf(fsmConfig.states).toMatchTypeOf<Record<StateName, StateMachineState<StateName, EventType, Context>>>();

  // Проверка типов переходов для состояний (с возможным undefined)
  expectTypeOf(fsmConfig.states.idle.on).toMatchTypeOf<Partial<Record<EventType, unknown>> | undefined>();
  expectTypeOf(fsmConfig.states.active.on).toMatchTypeOf<Partial<Record<EventType, unknown>> | undefined>();

  // Негативная проверка недопустимых переходов
  // @ts-expect-error: 'UNKNOWN_EVENT' не является допустимым типом события
  fsmConfig.states.idle.on.UNKNOWN_EVENT = [{ target: 'active' }];
});

test('State actions and conditions', () => {
  // Проверка типа действия для события
  const actionCheck = (ctx: Context, complete: (event?: EventType) => void) => {
    ctx.count += 1;
    complete('STOP');
  };
  expectTypeOf(actionCheck).toMatchTypeOf<(ctx: Context, complete: (event?: EventType) => void) => void>();

  // Проверка типа функции cond (условия перехода)
  const condCheck = (ctx: Context) => ctx.count > 0;
  expectTypeOf(condCheck).toMatchTypeOf<(ctx: Context) => boolean>();

  // Проверка типов действий при входе и выходе
  expectTypeOf(fsmConfig.states.idle.entry).toMatchTypeOf<StateMachineActionList<StateName, NoInfer<Context>> | undefined>();
  expectTypeOf(fsmConfig.states.active.exit).toMatchTypeOf<StateMachineActionList<StateName, NoInfer<Context>> | undefined>();
});

test('Invalid context configuration', () => {
  // Негативная проверка для неправильного типа контекста
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const wrongContext: StateMachineConfig<StateName, EventType, Context> = {
    initState: 'idle',
    // @ts-expect-error: тип свойства 'invalidField' не существует в типе 'Context'
    context: { invalidField: 'test' },
    states: {
      idle: {},
      active: {},
      stopped: {},
    },
  };
});
