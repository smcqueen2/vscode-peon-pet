import { getCharacterById, sizeFromSetting } from '../characters';
import type { Character } from '../characters';

const makeChar = (id: string, name: string): Character => ({
  id,
  manifest: { name },
  dir: `/fake/${id}`,
  isBuiltIn: id === 'orc',
});

const ORC = makeChar('orc', 'Orc Peon');
const TROLL = makeChar('troll', 'Forest Troll');
const CHARS: Character[] = [ORC, TROLL];

describe('getCharacterById', () => {
  it('finds a character by id', () => {
    expect(getCharacterById(CHARS, 'troll')).toBe(TROLL);
  });

  it('returns the first character (orc) when id is not found', () => {
    expect(getCharacterById(CHARS, 'goblin')).toBe(ORC);
  });

  it('returns the first character when the list has exactly one entry', () => {
    expect(getCharacterById([ORC], 'anything')).toBe(ORC);
  });

  it('finds the built-in orc by its own id', () => {
    expect(getCharacterById(CHARS, 'orc')).toBe(ORC);
  });
});

describe('sizeFromSetting', () => {
  it('maps small to 150', () => {
    expect(sizeFromSetting('small')).toBe(150);
  });

  it('maps medium to 200', () => {
    expect(sizeFromSetting('medium')).toBe(200);
  });

  it('maps large to 250', () => {
    expect(sizeFromSetting('large')).toBe(250);
  });

  it('falls back to 200 for an unrecognised value', () => {
    expect(sizeFromSetting('huge')).toBe(200);
  });

  it('falls back to 200 for an empty string', () => {
    expect(sizeFromSetting('')).toBe(200);
  });
});
