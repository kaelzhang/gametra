# Cases

## Master
- will never exit
- should only be started once

## Non-master
- will exit when
  - if there is an exit action, and it is triggered
  - if there is no exit action, and the cargo is drained
- actions will be purged when the scheduler is exited
- could be started multiple times
  - but only when it has been reset

## Both
- when it forks
  - it will pause itself
  - it will resume the forked scheduler
- when the forked scheduler is exited
  - it will resume itself
  - it will pause the forked scheduler


main
-> click
o-> viewport freeze -> reload
o-> invite -> fork
    -> fork: click
    -> idle: fish button -> click
    o-> not active -> exit
