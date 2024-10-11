import { bench } from 'vitest';

import { FiniteStateMachine } from '../fsm';

bench('FiniteStateMachine performance under load', () => {
  const fsm = new FiniteStateMachine({
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
