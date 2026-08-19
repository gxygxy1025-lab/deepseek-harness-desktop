import { resolve } from 'node:path'

import { runTaskBoardWorktreeE2E } from './task-board-worktree-e2e-runner.mjs'

const result = await runTaskBoardWorktreeE2E({ appDir: resolve('.') })
console.log(`packaged Task Board Worktree E2E ${JSON.stringify(result)}`)
