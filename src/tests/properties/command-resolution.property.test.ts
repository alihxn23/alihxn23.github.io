import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { COMMANDS, resolveCommand } from '../../scripts/terminal-nav';

/**
 * Feature: personal-website-redesign
 * Property 3: Valid commands resolve to correct target section
 *
 * Validates: Requirements 9.2
 *
 * This test verifies that for any registered command name or alias in the
 * terminal command registry, executing that command resolves to the correct
 * target section identifier as defined in the command definition.
 */
describe('Feature: personal-website-redesign, Property 3: Valid commands resolve to correct target section', () => {
  /**
   * Build a flat list of all valid inputs (names + aliases) paired with their expected command.
   */
  const allValidInputs = COMMANDS.flatMap((cmd) => {
    const nameEntry = { input: cmd.name, expectedCommand: cmd };
    const aliasEntries = cmd.aliases.map((alias) => ({
      input: alias,
      expectedCommand: cmd,
    }));
    return [nameEntry, ...aliasEntries];
  });

  /**
   * Arbitrary that selects a random valid command input (name or alias)
   * from the registry.
   */
  const validCommandArb = fc.constantFrom(...allValidInputs);

  /**
   * Generates a random case variation of a string.
   * For each character, randomly picks uppercase or lowercase.
   */
  const randomCaseArb = (str: string) =>
    fc
      .array(fc.boolean(), { minLength: str.length, maxLength: str.length })
      .map((flags) =>
        str
          .split('')
          .map((ch, i) => (flags[i] ? ch.toUpperCase() : ch.toLowerCase()))
          .join('')
      );

  it('should resolve any registered command name or alias to the correct CommandDefinition', () => {
    fc.assert(
      fc.property(validCommandArb, ({ input, expectedCommand }) => {
        const result = resolveCommand(input);

        expect(result).not.toBeNull();
        expect(result!.name).toBe(expectedCommand.name);
        expect(result!.targetSection).toBe(expectedCommand.targetSection);
        expect(result!.description).toBe(expectedCommand.description);
        expect(result!.aliases).toEqual(expectedCommand.aliases);
      }),
      { numRuns: 100 }
    );
  });

  it('should resolve commands case-insensitively with random case variations', () => {
    fc.assert(
      fc.property(
        validCommandArb.chain(({ input, expectedCommand }) =>
          randomCaseArb(input).map((casedInput) => ({
            casedInput,
            expectedCommand,
          }))
        ),
        ({ casedInput, expectedCommand }) => {
          const result = resolveCommand(casedInput);

          expect(result).not.toBeNull();
          expect(result!.name).toBe(expectedCommand.name);
          expect(result!.targetSection).toBe(expectedCommand.targetSection);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should resolve commands with leading/trailing whitespace', () => {
    fc.assert(
      fc.property(
        validCommandArb,
        fc.stringOf(fc.constant(' '), { minLength: 0, maxLength: 5 }),
        fc.stringOf(fc.constant(' '), { minLength: 0, maxLength: 5 }),
        ({ input, expectedCommand }, leadingSpaces, trailingSpaces) => {
          const paddedInput = leadingSpaces + input + trailingSpaces;
          const result = resolveCommand(paddedInput);

          expect(result).not.toBeNull();
          expect(result!.name).toBe(expectedCommand.name);
          expect(result!.targetSection).toBe(expectedCommand.targetSection);
        }
      ),
      { numRuns: 100 }
    );
  });
});
