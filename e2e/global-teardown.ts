import type { ChildProcessWithoutNullStreams } from 'child_process';

export default async () => {
  const anvil: ChildProcessWithoutNullStreams = (global as any).anvil;
  if (anvil) {
    anvil.kill();
    console.log('🧹 Cleaned up the Anvil process!');
  }
};
