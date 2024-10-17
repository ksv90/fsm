import { bench } from 'vitest';

import { StateMachine } from '../fsm';

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
    fsm.send('NEXT');
  }
});
