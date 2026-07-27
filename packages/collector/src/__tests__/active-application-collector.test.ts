import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ActiveApplicationSourcePort,
  ActiveApplicationSourceResult,
} from '@replay/application';
import { UtcInstant } from '@replay/domain';

import {
  ActiveApplicationCollector,
  MacosActiveApplicationAdapter,
} from '../index.js';
import type { CommandRunnerPort } from '../macos-active-application-adapter.js';

class SequenceSource implements ActiveApplicationSourcePort {
  #index = 0;

  public constructor(
    private readonly results: readonly ActiveApplicationSourceResult[],
  ) {}

  public observe(): Promise<ActiveApplicationSourceResult> {
    const result = this.results[this.#index];
    if (result === undefined) {
      throw new Error('Test source sequence exhausted.');
    }
    this.#index += 1;
    return Promise.resolve(result);
  }
}

const available = (
  applicationName: string,
  bundleId: string,
): ActiveApplicationSourceResult => ({
  status: 'available',
  snapshot: { applicationName, bundleId },
});

await test('emits only on context change or heartbeat with injected time', async () => {
  const source = new SequenceSource([
    available('Cursor', 'com.todesktop.230313mzl4w4u92'),
    available('Cursor', 'com.todesktop.230313mzl4w4u92'),
    available('Cursor', 'com.todesktop.230313mzl4w4u92'),
    available('Terminal', 'com.apple.Terminal'),
  ]);
  const times = [0, 1_000, 5_000, 5_001];
  let index = 0;
  const collector = new ActiveApplicationCollector({
    source,
    clock: {
      now: () => {
        const value = times[index];
        assert.ok(value !== undefined);
        index += 1;
        return UtcInstant.fromEpochMilliseconds(value);
      },
    },
    heartbeatMilliseconds: 5_000,
  });

  const first = await collector.poll();
  const unchanged = await collector.poll();
  const heartbeat = await collector.poll();
  const changed = await collector.poll();

  assert.equal(first.status, 'emitted');
  assert.equal(unchanged.status, 'unchanged');
  assert.equal(heartbeat.status, 'emitted');
  assert.equal(changed.status, 'emitted');
  assert.equal(first.observation.reason, 'context_changed');
  assert.equal(heartbeat.observation.reason, 'heartbeat');
  assert.deepEqual(Object.keys(changed.observation).sort(), [
    'applicationName',
    'bundleId',
    'occurredAt',
    'reason',
  ]);
});

await test('permission health passes through without reading the clock', async () => {
  const guidance = 'Open Accessibility settings.';
  const collector = new ActiveApplicationCollector({
    source: new SequenceSource([{ status: 'permission_required', guidance }]),
    clock: {
      now: () => {
        throw new Error('Clock must not be read for failed observations.');
      },
    },
    heartbeatMilliseconds: 5_000,
  });
  assert.deepEqual(await collector.poll(), {
    status: 'permission_required',
    guidance,
  });
});

await test('macOS adapter exposes only allowlisted identity fields', async () => {
  let capturedExecutable = '';
  let capturedArgs: readonly string[] = [];
  const runner: CommandRunnerPort = {
    run(executable, args) {
      capturedExecutable = executable;
      capturedArgs = args;
      return Promise.resolve({
        stdout: JSON.stringify({
          trusted: true,
          applicationName: 'Cursor',
          bundleId: 'com.todesktop.230313mzl4w4u92',
          windowTitle: 'must be ignored',
        }),
        stderr: '',
      });
    },
  };
  const result = await new MacosActiveApplicationAdapter(runner).observe();
  assert.equal(capturedExecutable, '/usr/bin/osascript');
  assert.equal(capturedArgs.includes('JavaScript'), true);
  assert.deepEqual(
    result,
    available('Cursor', 'com.todesktop.230313mzl4w4u92'),
  );
  if (result.status === 'available') {
    assert.deepEqual(Object.keys(result.snapshot).sort(), [
      'applicationName',
      'bundleId',
    ]);
  }
});

await test('macOS adapter explains missing Accessibility permission', async () => {
  const runner: CommandRunnerPort = {
    run: () =>
      Promise.resolve({
        stdout: JSON.stringify({
          trusted: false,
          applicationName: 'Cursor',
          bundleId: 'com.example.Cursor',
        }),
        stderr: '',
      }),
  };
  const result = await new MacosActiveApplicationAdapter(runner).observe();
  assert.equal(result.status, 'permission_required');
  assert.equal(result.guidance.includes('Accessibility'), true);
});

await test(
  'macOS integration boundary returns identity or actionable health',
  { skip: process.platform !== 'darwin' },
  async () => {
    const result = await new MacosActiveApplicationAdapter().observe();
    assert.equal(
      ['available', 'permission_required', 'unavailable'].includes(
        result.status,
      ),
      true,
    );
    if (result.status === 'available') {
      assert.equal(result.snapshot.applicationName.length > 0, true);
      assert.equal(result.snapshot.bundleId.length > 0, true);
    } else {
      assert.equal(result.guidance.length > 0, true);
    }
  },
);
