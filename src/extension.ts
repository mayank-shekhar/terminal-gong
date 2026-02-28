import * as vscode from 'vscode';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn } from 'node:child_process';
import * as path from 'node:path';

const SETTING_PREFIX = 'terminalGong';

export function activate(context: vscode.ExtensionContext): void {
  const testDisposable = vscode.commands.registerCommand('terminalGong.testSound', async () => {
    const soundPath = await resolveSoundPath(context);
    if (!soundPath) {
      vscode.window.showWarningMessage(
        'Terminal Gong: Could not find a sound file. Set terminalGong.soundFilePath or add media/funny.mp3.'
      );
      return;
    }

    const ok = await playSound(soundPath);
    if (!ok) {
      vscode.window.showErrorMessage('Terminal Gong: Failed to play sound. Check README for OS playback dependencies.');
    }
  });

  context.subscriptions.push(testDisposable);

  const api = vscode.window as unknown as {
    onDidEndTerminalShellExecution?: (
      listener: (event: unknown) => void,
      thisArgs?: unknown,
      disposables?: vscode.Disposable[]
    ) => vscode.Disposable;
  };

  if (!api.onDidEndTerminalShellExecution) {
    vscode.window.showWarningMessage(
      'Terminal Gong: this VS Code/Cursor build does not expose terminal shell execution events. Please update editor.'
    );
    return;
  }

  const endExecutionDisposable = api.onDidEndTerminalShellExecution(async (event: unknown) => {
    const cfg = vscode.workspace.getConfiguration(SETTING_PREFIX);
    if (!cfg.get<boolean>('enabled', true)) {
      return;
    }

    const exitCode = getExitCode(event);
    if (exitCode === undefined || exitCode === 0) {
      return;
    }

    const soundPath = await resolveSoundPath(context);
    if (!soundPath) {
      return;
    }

    await playSound(soundPath);

    if (cfg.get<boolean>('showFailureMessage', false)) {
      const commandLine = getCommandLine(event);
      const suffix = commandLine ? `: ${commandLine}` : '';
      void vscode.window.showInformationMessage(`Command failed (exit ${exitCode})${suffix}`);
    }
  });

  context.subscriptions.push(endExecutionDisposable);
}

export function deactivate(): void {
  // Nothing to clean up.
}

function getExitCode(event: unknown): number | undefined {
  if (!event || typeof event !== 'object') {
    return undefined;
  }

  const maybeEvent = event as { exitCode?: number };
  if (typeof maybeEvent.exitCode === 'number') {
    return maybeEvent.exitCode;
  }

  return undefined;
}

function getCommandLine(event: unknown): string | undefined {
  if (!event || typeof event !== 'object') {
    return undefined;
  }

  const maybeEvent = event as { execution?: { commandLine?: { value?: string } | string } };
  const cmd = maybeEvent.execution?.commandLine;

  if (typeof cmd === 'string') {
    return cmd;
  }

  if (cmd && typeof cmd === 'object' && typeof cmd.value === 'string') {
    return cmd.value;
  }

  return undefined;
}

async function resolveSoundPath(context: vscode.ExtensionContext): Promise<string | undefined> {
  const cfg = vscode.workspace.getConfiguration(SETTING_PREFIX);
  const configured = cfg.get<string>('soundFilePath', '').trim();

  if (configured.length > 0) {
    const expanded = expandHome(configured);
    if (await fileExists(expanded)) {
      return expanded;
    }

    return undefined;
  }

  const bundled = path.join(context.extensionPath, 'media', 'funny.mp3');
  if (await fileExists(bundled)) {
    return bundled;
  }

  return undefined;
}

function expandHome(inputPath: string): string {
  if (!inputPath.startsWith('~')) {
    return inputPath;
  }

  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) {
    return inputPath;
  }

  return path.join(home, inputPath.slice(1));
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function playSound(soundPath: string): Promise<boolean> {
  const platform = process.platform;

  if (platform === 'darwin') {
    return run('afplay', [soundPath]);
  }

  if (platform === 'win32') {
    const escaped = soundPath.replace(/'/g, "''");
    const command = [
      'Add-Type -AssemblyName presentationCore;',
      `$p = New-Object System.Windows.Media.MediaPlayer;`,
      `$p.Open([Uri]::new('${escaped}'));`,
      '$p.Volume = 1.0;',
      '$p.Play();',
      'Start-Sleep -Milliseconds 1800;'
    ].join(' ');

    return run('powershell', ['-NoProfile', '-NonInteractive', '-Command', command]);
  }

  const linuxPlayers: Array<{ cmd: string; args: string[] }> = [
    { cmd: 'paplay', args: [soundPath] },
    { cmd: 'aplay', args: [soundPath] },
    { cmd: 'ffplay', args: ['-nodisp', '-autoexit', '-loglevel', 'quiet', soundPath] },
    { cmd: 'mpg123', args: [soundPath] }
  ];

  for (const player of linuxPlayers) {
    if (await run(player.cmd, player.args)) {
      return true;
    }
  }

  return false;
}

function run(command: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'ignore'
    });

    child.on('error', () => resolve(false));
    child.on('exit', (code) => resolve(code === 0));
  });
}
