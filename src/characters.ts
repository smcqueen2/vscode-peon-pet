import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/** Metadata read from a character pack's `manifest.json`. */
export interface CharacterManifest {
  name: string;
  author?: string;
  description?: string;
  /** Override the sprite frame size in pixels (default: derived from atlas dimensions). */
  frameSize?: number;
}

/** A resolved character pack, either built-in or user-installed. */
export interface Character {
  /** Unique identifier — `'orc'` for the built-in, or the folder name for custom packs. */
  id: string;
  manifest: CharacterManifest;
  /** Absolute path to the directory containing the character's assets. */
  dir: string;
  /** `true` for the bundled orc; `false` for packs in `~/.openpeon/characters/`. */
  isBuiltIn: boolean;
}

/** Resolved absolute paths to a character's image assets. */
export interface CharacterAssets {
  /** 6×6 sprite atlas PNG (required). */
  spriteAtlas: string;
  /** Optional decorative border overlay PNG. */
  borders: string | null;
  /** Optional background texture PNG. */
  bg: string | null;
}

/** Root directory for user-installed custom character packs. */
const CUSTOM_CHARS_DIR = path.join(os.homedir(), '.openpeon', 'characters');

/**
 * Scans for all available character packs:
 * 1. The built-in `orc` pack (always available, bundled with the extension).
 * 2. Any valid packs found in `~/.openpeon/characters/<name>/`.
 *
 * A valid custom pack must contain `sprite-atlas.png`. `manifest.json` is
 * optional — if absent, the folder name is used as the display name.
 */
export function scanCharacters(extensionMediaPath: string): Character[] {
  const chars: Character[] = [];

  chars.push({
    id: 'orc',
    manifest: { name: 'Orc Peon', description: 'The original Warcraft III Orc Peon.' },
    dir: path.join(extensionMediaPath, 'assets'),
    isBuiltIn: true,
  });

  try {
    if (fs.existsSync(CUSTOM_CHARS_DIR)) {
      const entries = fs.readdirSync(CUSTOM_CHARS_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }
        const charDir = path.join(CUSTOM_CHARS_DIR, entry.name);
        const atlasPath = path.join(charDir, 'sprite-atlas.png');
        if (!fs.existsSync(atlasPath)) {
          continue;
        }

        let manifest: CharacterManifest = { name: entry.name };
        const manifestPath = path.join(charDir, 'manifest.json');
        try {
          manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as CharacterManifest;
        } catch {
          // manifest.json is optional; fall back to folder name
        }

        chars.push({ id: entry.name, manifest, dir: charDir, isBuiltIn: false });
      }
    }
  } catch {
    // Ignore scan errors (e.g. directory not yet created)
  }

  return chars;
}

/**
 * Finds a character by `id`. Falls back to the first character in the list
 * (always the built-in orc) if the requested ID is not found.
 */
export function getCharacterById(chars: Character[], id: string): Character {
  return chars.find((c) => c.id === id) ?? chars[0];
}

/**
 * Resolves the asset paths for a character. Built-in assets use the fixed
 * `orc-` prefix; custom pack assets use the generic names defined in the
 * custom character spec.
 */
export function getCharacterAssets(char: Character): CharacterAssets {
  if (char.isBuiltIn) {
    return {
      spriteAtlas: path.join(char.dir, 'orc-sprite-atlas.png'),
      borders: path.join(char.dir, 'orc-borders.png'),
      bg: path.join(char.dir, 'bg-pixel.png'),
    };
  }
  const borders = path.join(char.dir, 'borders.png');
  const bg = path.join(char.dir, 'bg.png');
  return {
    spriteAtlas: path.join(char.dir, 'sprite-atlas.png'),
    borders: fs.existsSync(borders) ? borders : null,
    bg: fs.existsSync(bg) ? bg : null,
  };
}

/** Converts the `peon-pet.size` setting string to a pixel value. */
export function sizeFromSetting(setting: string): number {
  switch (setting) {
    case 'small':
      return 150;
    case 'large':
      return 250;
    default:
      return 200;
  }
}
