# Finite State Machine (FSM)

A library for creating Finite State Machines (FSM) with event-driven support. This tool enables state management and event handling in applications, offering flexibility and ease in configuring transitions and actions when state changes.

## Table of Contents
1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Detailed Functionality](#detailed-functionality)
   - [States and Transitions](#states-and-transitions)
   - [Transition Object](#transition-object)
   - [FSM Context](#fsm-context)
   - [Actions](#actions)
   - [Job](#job)
   - [Emit Object](#emit-object)
   - [EventEmitter Support](#eventemitter-support)
4. [Configuration and Options](#configuration-and-options)
5. [Error Handling](#error-handling)
6. [License](#license)
7. [Acknowledgments and Inspiration](#acknowledgments-and-inspiration)
8. [Contribution](#contribution)
9. [Examples](#examples)


## Installation

To install the library, use your preferred package manager:

```bash
npm install @ksv90/fsm
```

This command will add the library to your project's dependencies, allowing you to use the FSM in your code.

FSM requires the @ksv90/decorators package, which is listed as peerDependencies. This means that for npm versions higher than 7, the package will be added automatically if it is not in the core dependencies. Otherwise, you need to add it manually.


## Quick Start

Below is a quick example of using a Finite State Machine (FSM). This example demonstrates how to create a simple FSM, add event listeners, and manage transitions between states.

```ts
import { FiniteStateMachine } from './fsm';

// Creating a new FSM with initial states
const fsm = new FiniteStateMachine({
  initState: 'idle',
  context: {},
  states: {
    idle: {
      on: { START: [{ target: 'running' }] },
    },
    running: {
      on: { STOP: [{ target: 'idle' }] },
    },
  },
});

// Subscribing to FSM events using EventEmitter
fsm.on('transition', ({ stateName, nextStateName }) => {
  console.log(`Переход: ${stateName} -> ${nextStateName}`);
});

// Starting the FSM and state transitions
fsm.start(); // Transitions to the 'idle' state
fsm.send('START'); // Transitions to the 'running' state
fsm.send('STOP'); // Transitions back to the 'idle' state
```

This example shows how easy it is to create a finite state machine, start it, add listeners, and manage states using an event-driven model.


## Detailed Functionality

### States and Transitions

Finite State Machine (FSM) manages transitions between states based on events. Each state defines transitions to other states in response to specific events.

Example state structure:

```ts
const fsm = new FiniteStateMachine({
  initState: 'idle',
  context: { count: 0 },
  states: {
    idle: {
      entry: [(context) => (context.count += 1)],
      job: async () => {
        console.log('Асинхронная задача');
        await new Promise((resolve) => setTimeout(resolve, 100));
      },
      exit: [(context) => (context.count -= 1)],
      on: {
        START: [
          { target: 'running', cond: (context) => context.count > 0, actions: [(context) => (context.count *= 2)] },
        ],
      },
    },
    running: {
      on: { STOP: [{ target: 'idle' }] },
    },
  },
});
```

initState: The initial state of the FSM, in this example — idle.
states: An object containing the state definitions and possible transitions.

### External State Transitions

FSM reacts to events that trigger state transitions. Events are sent using the send method.

Example of event usage:

```ts
fsm.send('START'); // Transition from 'idle' to 'running'
fsm.send('STOP');  // Transition from 'running' to 'idle'
```

- send(eventType): Sends an event to the FSM, initiating a corresponding transition if one exists for the current state.

### Transition Object

The Transition Object describes possible state transitions and actions that are executed during these transitions. Each transition can include the following properties:

- target: The state to transition to.
- actions: Actions executed during the transition.
- cond: A condition determining whether the transition should occur.

```ts
idle: {
  on: { 
    START: [{ target: 'running', cond: (context) => context.count > 0, actions: [(context) => (context.count *= 2)] }] 
  },
}
```

### FSM Context

The context is used to store data between state transitions. It is accessible within all actions and conditions.

```ts
context: { count: 0 }
```

### Actions

FSM supports several types of actions:

- entry: Executed upon entering a state.
- exit: Executed upon exiting a state.
- actions: Executed during a transition between states.

```ts
idle: {
  entry: [(context) => (context.count += 1)],
  exit: [(context) => (context.count -= 1)],
}
```

### Job

job is an asynchronous or synchronous task executed upon entering a state after the entry actions.

```ts
idle: {
  job: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  },
}
```

```ts
idle: {
  job: (_ctx, complete) => {
    setTimeout(complete, 200);
  },
}
```

If the second argument *complete* is not specified, the function terminates after all instructions have been executed.

### Emit Object

emit is used to automatically trigger events after the completion of state actions and tasks.

```ts
idle: {
  emit: [
    { eventType: 'START', cond: (context) => context.count > 10 },
  ],
}
```

### EventEmitter Support

FSM uses EventEmitter to handle events such as the start and end of transitions, state entry, and state exit.

```ts
fsm.on('entry', (context) => {
  console.log(`Entering state with context:`, context);
});
```

Available events:

- ```start```: FSM started.
- ```entry```: Entering a state.
- ```job```: Executing a task within a state.
- ```pending```: Waiting for a state transition (idle).
- ```transition```: Transitioning between states.
- ```exit```: Exiting a state.
- ```finish```: FSM process completed.
- ```stop```: FSM stopped.

Each of these events passes specific data to the handler, allowing you to react to changes in the machine's state.

### Configuration and Options

Finite State Machine (FSM) supports various configuration options that allow you to adjust its behavior and error handling using the types OptionsFSM and CustomErrorMessagesFSM.

Example of OptionsFSM:

```ts
export type OptionsFSM = {
  timeForWork?: number;
  errorMessages?: {
    getAlreadyStartedMessage?: () => string;
    getRestartNotAllowedMessage?: () => string;
    getCannotSendIfNotStartedMessage?: () => string;
    getCannotSendWhenStoppedMessage?: () => string;
    getUnsupportedTransitionsMessage?: (stateName: string) => string;
    getInvalidEventTypeMessage?: (stateName: string, eventType: string) => string;
    getNoTransitionObjectMessage?: (stateName: string, eventType: string) => string;
    getActionTimeLimitExceededMessage?: (stateName: string, errorDelay: number) => string;
};
```

- timeForWork: The time in milliseconds allowed for tasks in the state to execute before timing out. If the task does not complete in the allotted time, an error message will be raised. Usage: This parameter is useful for limiting the time asynchronous tasks execute in the state and preventing potential memory leaks.

```ts
const options: OptionsFSM = {
  timeForWork: 5000, // 5 seconds to complete the task
};
```

- errorMessages: An object containing custom error messages for various situations that may occur during FSM operation. Allows you to customize the text of error messages to make them more informative and understandable to the user.

```ts
const options: OptionsFSM = {
  errorMessages: {
    getAlreadyStartedMessage: () => 'FSM is already running and cannot be started again',
  },
};
```


## Error Handling

FSM uses exception handling mechanisms to manage unexpected situations, ensuring the application continues to run smoothly.

Example of error handling using the error event:

```ts
fsm.on('error', (error) => {
  console.error('An error occurred in the FSM:', error.message);
  // Error handling logic
});
```


## License

This library is distributed under the MIT license, which means that it can be used by anyone without exception. The MIT license grants users the following rights:

Freedom of use: You can use the library for any purpose, including commercial and non-commercial projects.
Freedom of distribution: You are free to copy, modify, and distribute the library or its derivative works.
Ease of integration: The license allows you to integrate the library into other projects without having to disclose the source code of your project.


## Acknowledgments and Inspiration

This library was inspired by the [@xstate/fsm](https://github.com/statelyai/xstate/tree/xstate%404.38.3/packages/xstate-fsm) package. I am grateful to the developers of @xstate/fsm for their contribution to the community and creating a powerful tool for managing finite state machines.

I used ideas and concepts from *@xstate/fsm* to create my own solution tailored to my needs, and added features that I think make state machines even more convenient and powerful for use in real projects.


## Contribution

Anyone is welcome to contribute to the development of this library.


## Examples

