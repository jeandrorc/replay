import { execFile } from 'node:child_process';

import type {
  ActiveApplicationSourcePort,
  ActiveApplicationSourceResult,
} from '@replay/application';

interface CommandResult {
  readonly stdout: string;
  readonly stderr: string;
}

export interface CommandRunnerPort {
  run(executable: string, args: readonly string[]): Promise<CommandResult>;
}

const SCRIPT = `
ObjC.import('AppKit');
ObjC.import('ApplicationServices');
const app = $.NSWorkspace.sharedWorkspace.frontmostApplication;
JSON.stringify({
  trusted: Boolean($.AXIsProcessTrusted()),
  applicationName: ObjC.unwrap(app.localizedName),
  bundleId: ObjC.unwrap(app.bundleIdentifier)
});
`;

const defaultRunner: CommandRunnerPort = {
  run(executable, args): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      execFile(
        executable,
        [...args],
        { timeout: 2_000, maxBuffer: 4_096, encoding: 'utf8' },
        (error, stdout, stderr) => {
          if (error) {
            reject(
              new Error('macOS active-application query failed.', {
                cause: error,
              }),
            );
            return;
          }
          resolve({ stdout, stderr });
        },
      );
    });
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseSnapshot = (output: string): ActiveApplicationSourceResult => {
  const parsed: unknown = JSON.parse(output);
  if (!isRecord(parsed) || typeof parsed.trusted !== 'boolean') {
    throw new TypeError(
      'macOS returned an invalid active-application response.',
    );
  }
  if (!parsed.trusted) {
    return {
      status: 'permission_required',
      guidance:
        'Allow Replay in System Settings > Privacy & Security > Accessibility, then retry.',
    };
  }
  if (
    typeof parsed.applicationName !== 'string' ||
    parsed.applicationName.length === 0 ||
    typeof parsed.bundleId !== 'string' ||
    parsed.bundleId.length === 0
  ) {
    throw new TypeError('macOS returned incomplete application identity.');
  }
  return {
    status: 'available',
    snapshot: {
      applicationName: parsed.applicationName,
      bundleId: parsed.bundleId,
    },
  };
};

export class MacosActiveApplicationAdapter
  implements ActiveApplicationSourcePort
{
  public constructor(
    private readonly runner: CommandRunnerPort = defaultRunner,
  ) {}

  public async observe(): Promise<ActiveApplicationSourceResult> {
    if (process.platform !== 'darwin') {
      return {
        status: 'unavailable',
        guidance: 'Active-application capture is available only on macOS.',
      };
    }
    try {
      const result = await this.runner.run('/usr/bin/osascript', [
        '-l',
        'JavaScript',
        '-e',
        SCRIPT,
      ]);
      return parseSnapshot(result.stdout.trim());
    } catch {
      return {
        status: 'unavailable',
        guidance:
          'Replay could not read the active application. Check macOS privacy permissions and retry.',
      };
    }
  }
}
