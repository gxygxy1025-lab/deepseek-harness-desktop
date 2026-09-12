process.stdout.write('dsh web: http://127.0.0.1:43125\n')
if (process.env.DSH_TEST_RUNTIME_STDERR) process.stderr.write(`${process.env.DSH_TEST_RUNTIME_STDERR}\n`)
if (process.env.DSH_TEST_REQUIRE_OPEN_STDIN === '1') {
  let stdinEnded = process.stdin.readableEnded
  process.stdin.once('end', () => {
    stdinEnded = true
  })
  setTimeout(() => process.exit(stdinEnded ? 24 : Number(process.env.DSH_TEST_RUNTIME_EXIT_CODE ?? 0)), 50)
} else {
  process.exit(Number(process.env.DSH_TEST_RUNTIME_EXIT_CODE ?? 0))
}
