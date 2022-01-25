export function exit(code: number, failureMessage?: string) {
  if (failureMessage) {
    console.error('ERROR:', failureMessage)
  }
  
  process.exit(code)
}
