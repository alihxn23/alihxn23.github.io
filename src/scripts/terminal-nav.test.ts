/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  COMMANDS,
  resolveCommand,
  processCommand,
  getHelpMessage,
  TerminalNav,
  type CommandDefinition,
} from './terminal-nav';

describe('terminal-nav', () => {
  describe('COMMANDS registry', () => {
    it('contains all expected navigation commands', () => {
      const names = COMMANDS.map((c) => c.name);
      expect(names).toContain('about');
      expect(names).toContain('experience');
      expect(names).toContain('skills');
      expect(names).toContain('certs');
      expect(names).toContain('education');
      expect(names).toContain('contact');
      expect(names).toContain('help');
      expect(names).toContain('clear');
    });

    it('each command has a non-empty name and description', () => {
      for (const cmd of COMMANDS) {
        expect(cmd.name.length).toBeGreaterThan(0);
        expect(cmd.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('resolveCommand', () => {
    it('returns null for empty string', () => {
      expect(resolveCommand('')).toBeNull();
    });

    it('returns null for whitespace-only input', () => {
      expect(resolveCommand('   ')).toBeNull();
    });

    it('matches command names exactly', () => {
      const result = resolveCommand('experience');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('experience');
    });

    it('matches commands case-insensitively', () => {
      expect(resolveCommand('EXPERIENCE')?.name).toBe('experience');
      expect(resolveCommand('Skills')?.name).toBe('skills');
      expect(resolveCommand('HELP')?.name).toBe('help');
    });

    it('matches aliases case-insensitively', () => {
      expect(resolveCommand('whoami')?.name).toBe('about');
      expect(resolveCommand('WHOAMI')?.name).toBe('about');
      expect(resolveCommand('Exp')?.name).toBe('experience');
      expect(resolveCommand('?')?.name).toBe('help');
      expect(resolveCommand('cls')?.name).toBe('clear');
    });

    it('returns null for unrecognized commands', () => {
      expect(resolveCommand('unknown')).toBeNull();
      expect(resolveCommand('foo')).toBeNull();
      expect(resolveCommand('123')).toBeNull();
    });

    it('trims whitespace before matching', () => {
      expect(resolveCommand('  about  ')?.name).toBe('about');
    });
  });

  describe('processCommand', () => {
    it('returns null for empty input (no-op)', () => {
      expect(processCommand('')).toBeNull();
      expect(processCommand('   ')).toBeNull();
    });

    it('returns navigation result for valid section commands', () => {
      const result = processCommand('experience');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('navigation');
      expect(result!.command?.name).toBe('experience');
      expect(result!.command?.targetSection).toBe('#experience');
    });

    it('returns help result for help command', () => {
      const result = processCommand('help');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('help');
      expect(result!.message).toContain('Available commands');
    });

    it('returns help result for ? alias', () => {
      const result = processCommand('?');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('help');
    });

    it('returns clear result for clear command', () => {
      const result = processCommand('clear');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('clear');
    });

    it('returns error with help message for unrecognized commands', () => {
      const result = processCommand('foobar');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('error');
      expect(result!.command).toBeNull();
      expect(result!.message).toContain('Command not found: foobar');
      expect(result!.message).toContain('Available commands');
    });
  });

  describe('getHelpMessage', () => {
    it('lists all commands', () => {
      const help = getHelpMessage();
      for (const cmd of COMMANDS) {
        expect(help).toContain(cmd.name);
      }
    });

    it('includes aliases in parentheses', () => {
      const help = getHelpMessage();
      expect(help).toContain('whoami');
      expect(help).toContain('exp');
    });
  });

  describe('TerminalNav class', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <input id="terminal-input" type="text" />
        <div id="terminal-output"></div>
        <section id="hero">Hero</section>
        <section id="experience">Experience</section>
      `;
    });

    it('initializes with empty history', () => {
      const nav = new TerminalNav('#terminal-input', '#terminal-output');
      expect(nav.getHistory()).toEqual([]);
    });

    it('processes input on Enter key', () => {
      const nav = new TerminalNav('#terminal-input', '#terminal-output');
      const input = document.querySelector<HTMLInputElement>('#terminal-input')!;

      input.value = 'help';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(nav.getHistory()).toEqual(['help']);
    });

    it('does not add empty input to history', () => {
      const nav = new TerminalNav('#terminal-input', '#terminal-output');
      const input = document.querySelector<HTMLInputElement>('#terminal-input')!;

      input.value = '';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(nav.getHistory()).toEqual([]);
    });

    it('clears input field after processing', () => {
      const nav = new TerminalNav('#terminal-input', '#terminal-output');
      const input = document.querySelector<HTMLInputElement>('#terminal-input')!;

      input.value = 'about';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(input.value).toBe('');
    });

    it('appends output to terminal output area', () => {
      const nav = new TerminalNav('#terminal-input', '#terminal-output');
      const input = document.querySelector<HTMLInputElement>('#terminal-input')!;
      const output = document.querySelector('#terminal-output')!;

      input.value = 'help';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(output.querySelector('.terminal-history-entry')).not.toBeNull();
      expect(output.textContent).toContain('Available commands');
    });

    it('clears output on clear command', () => {
      const nav = new TerminalNav('#terminal-input', '#terminal-output');
      const input = document.querySelector<HTMLInputElement>('#terminal-input')!;
      const output = document.querySelector('#terminal-output')!;

      // First add some output
      input.value = 'help';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(output.children.length).toBeGreaterThan(0);

      // Then clear
      input.value = 'clear';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(output.innerHTML).toBe('');
    });

    it('calls scrollIntoView for navigation commands', () => {
      const nav = new TerminalNav('#terminal-input', '#terminal-output');
      const input = document.querySelector<HTMLInputElement>('#terminal-input')!;
      const heroSection = document.querySelector('#hero')!;

      const scrollMock = vi.fn();
      heroSection.scrollIntoView = scrollMock;

      input.value = 'about';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(scrollMock).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('maintains command history across multiple inputs', () => {
      const nav = new TerminalNav('#terminal-input', '#terminal-output');
      const input = document.querySelector<HTMLInputElement>('#terminal-input')!;

      input.value = 'about';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      input.value = 'skills';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      input.value = 'help';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(nav.getHistory()).toEqual(['about', 'skills', 'help']);
    });

    it('does not respond to non-Enter keys', () => {
      const nav = new TerminalNav('#terminal-input', '#terminal-output');
      const input = document.querySelector<HTMLInputElement>('#terminal-input')!;

      input.value = 'about';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));

      expect(nav.getHistory()).toEqual([]);
      expect(input.value).toBe('about');
    });
  });
});
