# Terminal Gong

Play a funny sound whenever a terminal command fails (including invalid commands like `command not found`) in VS Code or Cursor.

## Features

- Watches terminal command completion events.
- Plays an audio file when the command exits with non-zero status.
- Works with your own MP3 file.
- Includes a `Terminal Gong: Test Sound` command.

## Requirements

- VS Code/Cursor build with terminal shell integration + shell execution events.
- Shell integration enabled:
  - `terminal.integrated.shellIntegration.enabled = true`

## Setup

1. Install the extension.
2. Put your MP3 somewhere on disk.
3. (Optional) Set `terminalGong.soundFilePath` to an absolute path if you want to override the bundled sound.
4. Run `Terminal Gong: Test Sound` from Command Palette.

If `terminalGong.soundFilePath` is empty, extension tries `media/funny.mp3` bundled inside the extension package.

## Extension Settings

- `terminalGong.enabled`: Enable/disable failure sound.
- `terminalGong.soundFilePath`: Absolute path to custom audio file.
- `terminalGong.showFailureMessage`: Also show a toast when command fails.

## Platform playback notes

- macOS: uses `afplay` (built-in).
- Windows: uses PowerShell `System.Windows.Media.MediaPlayer`.
- Linux: tries `paplay`, `aplay`, `ffplay`, then `mpg123`.

## Local Development

```bash
npm install
npm run compile
```

Press `F5` in VS Code to open an Extension Development Host.

## Packaging

```bash
npm install -g @vscode/vsce
vsce package
```

This creates a `.vsix` you can install manually (`Extensions: Install from VSIX...`).

## Publish to VS Code Marketplace

1. Create a publisher at https://marketplace.visualstudio.com/manage.
2. Create a Personal Access Token (PAT) in Azure DevOps with Marketplace `Manage` scope.
3. Login and publish:

```bash
vsce login <your-publisher-id>
vsce publish
```

## Publish to Open VSX (recommended for Cursor users)

1. Create account/token at https://open-vsx.org.
2. Install `ovsx`:

```bash
npm install -g ovsx
```

3. Publish:

```bash
ovsx publish -p <OPEN_VSX_TOKEN>
```

## Notes for your MP3

- Keep MP3 short (<2s) for fast feedback.
- Avoid loud peaks; normalize volume.

## License

MIT
