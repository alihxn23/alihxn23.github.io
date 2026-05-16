import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { COMMANDS, processCommand } from '../../scripts/terminal-nav';

/**
 * Feature: personal-website-redesign
 * Property 4: Unrecognized commands produce help response
 *
 * Validates: Requirements 9.3
 *
 * This test verifies that for any input string that does not match any
 * registered command name or alias (case-insensitive), the terminal
 * navigation system returns a help/error response listing available commands.
 */
describe('Feature: personal-website-redesign, Property 4: Unrecognized commands produce help response', () => {
  /**
   * Collect all registered command names and aliases (lowercased) for filtering.
   */
  const allRegisteredInputs = new Set<string>(
    COMMANDS.flatMap((cmd) => [cmd.name, ...cmd.aliases]).map((s) => s.toLowerCase())
  );

  /**
   * Arbitrary that generates non-empty strings which do NOT match any
   * registered command name or alias (case-insensitive, trimmed).
   */
  const unrecognizedCommandArb = fc
    .string({ minLength: 1 })
    .filter((s) => {
      const normalized = s.trim().toLowerCase();
      // Must have non-empty content after trimming
      if (normalized === '') return false;
      // Must not match any registered command
      return !allRegisteredInputs.has(normalized);
    });

  it('should return an error result with "Available commands" for any unrecognized input', () => {
    fc.assert(
      fc.property(unrecognizedCommandArb, (input) => {
        const result = processCommand(input);

        // Should not be null (null is only for empty input)
        expect(result).not.toBeNull();

        // Should be an error type
        expect(result!.type).toBe('error');

        // Should have no matched command
        expect(result!.command).toBeNull();

        // Message should contain "Available commands" (the help listing)
        expect(result!.message).toContain('Available commands');

        // Message should also indicate the command was not found
        expect(result!.message).toContain('Command not found');
      }),
      { numRuns: 100 }
    );
  });
});
