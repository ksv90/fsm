import { StateMachine } from 'src/fsm';
import { bench } from 'vitest';

bench('StateMachine performance under load', () => {
  const fsm = new StateMachine({
    initState: 'idle',
    context: {},
    states: {
      idle: { on: { NEXT: [{ target: 'idle' }] } },
    },
  });
  fsm.start();

  for (let i = 0; i < 10000; i++) {
    fsm.transition('NEXT');
  }
});
