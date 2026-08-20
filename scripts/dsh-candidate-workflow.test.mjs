import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const workflowPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.github', 'workflows', 'dsh-candidate-lite.yml')

test('Candidate Matrix workflow uses only explicit versions and an isolated temporary Desktop', async () => {
  const workflow = await readFile(workflowPath, 'utf8')
  assert.match(workflow, /workflow_dispatch:/u)
  assert.match(workflow, /schedule:/u)
  assert.match(workflow, /resolve-dsh-candidate-input\.mjs/u)
  assert.match(workflow, /git worktree add --detach/u)
  assert.match(workflow, /prepare-dsh-candidate\.mjs --version/u)
  assert.match(workflow, /candidate_root/u)
  assert.match(workflow, /generate-runtime-support\.mjs --support-status candidate/u)
  assert.doesNotMatch(workflow, /@deepseek-ai\/dsh@latest/u)
})

test('Candidate Matrix workflow emits reports and rejects a blocked candidate without mutating Stable', async () => {
  const workflow = await readFile(workflowPath, 'utf8')
  assert.match(workflow, /dsh-candidate-report\.json/u)
  assert.match(workflow, /dsh-candidate-report\.md/u)
  assert.match(workflow, /supported-runtimes\.candidate\.json/u)
  assert.match(workflow, /--candidate-report/u)
  assert.match(workflow, /stable checkout/i)
  assert.match(workflow, /git status --porcelain --untracked-files=no/u)
  assert.match(workflow, /Candidate Matrix report is blocked/u)
})
