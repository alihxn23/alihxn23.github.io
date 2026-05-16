/**
 * Terminal Navigation Module
 *
 * Provides a terminal-style command interface for navigating between
 * sections of the site. Commands are matched case-insensitively with
 * alias support. Unrecognized commands display a help message.
 *
 * Exports pure functions (resolveCommand, COMMANDS) for property-based testing.
 */

export interface CommandDefinition {
  name: string;
  aliases: string[];
  description: string;
  targetSection: string;
}

export interface CommandResult {
  type: "navigation" | "help" | "clear" | "error";
  command: CommandDefinition | null;
  message: string;
}

export const COMMANDS: CommandDefinition[] = [
  { name: "about", aliases: ["whoami", "hero"], description: "Who is Muhammad Ali Hasan", targetSection: "#hero" },
  { name: "experience", aliases: ["exp", "work"], description: "Professional experience", targetSection: "#experience" },
  { name: "skills", aliases: ["tech", "stack"], description: "Technical skills", targetSection: "#skills" },
  { name: "certs", aliases: ["certifications", "cert"], description: "Professional certifications", targetSection: "#certifications" },
  { name: "education", aliases: ["edu", "school"], description: "Education background", targetSection: "#education" },
  { name: "contact", aliases: ["social", "links"], description: "Contact and social links", targetSection: "#contact" },
  { name: "showall", aliases: ["cat *", "ls -a", "all"], description: "Reveal all sections", targetSection: "" },
  { name: "help", aliases: ["?", "commands"], description: "List available commands", targetSection: "" },
  { name: "clear", aliases: ["cls"], description: "Clear terminal history", targetSection: "" },
];

/**
 * Resolves user input to a matching command definition.
 * Matches case-insensitively against both command names and aliases.
 *
 * @param input - The raw user input string
 * @returns The matching CommandDefinition, or null if no match found
 */
export function resolveCommand(input: string): CommandDefinition | null {
  const normalized = input.trim().toLowerCase();
  if (normalized === "") return null;

  for (const cmd of COMMANDS) {
    if (cmd.name === normalized) return cmd;
    if (cmd.aliases.includes(normalized)) return cmd;
  }

  return null;
}

/**
 * Generates a help message listing all available commands.
 */
export function getHelpMessage(): string {
  const lines = ["Available commands:", ""];
  for (const cmd of COMMANDS) {
    const aliases = cmd.aliases.length > 0 ? ` (${cmd.aliases.join(", ")})` : "";
    lines.push(`  ${cmd.name}${aliases} - ${cmd.description}`);
  }
  return lines.join("\n");
}

/**
 * Processes user input and returns a CommandResult describing what action to take.
 *
 * @param input - The raw user input string
 * @returns A CommandResult with type, matched command, and display message
 */
export function processCommand(input: string): CommandResult | null {
  const trimmed = input.trim();

  // Empty input is a no-op
  if (trimmed === "") return null;

  const matched = resolveCommand(trimmed);

  if (matched === null) {
    return {
      type: "error",
      command: null,
      message: `Command not found: ${trimmed}\n\n${getHelpMessage()}`,
    };
  }

  if (matched.name === "help") {
    return {
      type: "help",
      command: matched,
      message: getHelpMessage(),
    };
  }

  if (matched.name === "clear") {
    return {
      type: "clear",
      command: matched,
      message: "",
    };
  }

  if (matched.name === "showall") {
    return {
      type: "navigation",
      command: matched,
      message: "Revealing all sections...",
    };
  }

  return {
    type: "navigation",
    command: matched,
    message: `Navigating to ${matched.name}...`,
  };
}

/**
 * TerminalNav class manages terminal state and DOM interactions.
 * Handles command history, input processing, and smooth scrolling.
 */
export class TerminalNav {
  private history: string[] = [];
  private inputEl: HTMLInputElement | null = null;
  private outputEl: HTMLElement | null = null;

  constructor(inputSelector: string, outputSelector: string) {
    if (typeof document === "undefined") return;

    this.inputEl = document.querySelector<HTMLInputElement>(inputSelector);
    this.outputEl = document.querySelector<HTMLElement>(outputSelector);

    if (this.inputEl) {
      this.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          this.handleInput();
        }
      });
    }
  }

  /** Returns a copy of the command history */
  getHistory(): string[] {
    return [...this.history];
  }

  /** Processes the current input value */
  handleInput(): void {
    if (!this.inputEl) return;

    const input = this.inputEl.value;
    this.inputEl.value = "";

    const result = processCommand(input);

    // Empty input is a no-op — don't add to history
    if (result === null) return;

    // Add to history
    this.history.push(input.trim());

    switch (result.type) {
      case "navigation":
        this.appendOutput(`$ ${input.trim()}`, result.message);
        if (result.command!.name === "showall") {
          this.revealAllSections();
        } else {
          this.hideAllSections();
          this.revealSection(result.command!.targetSection);
          this.scrollToSection(result.command!.targetSection);
        }
        break;
      case "help":
        this.appendOutput(`$ ${input.trim()}`, result.message);
        break;
      case "clear":
        this.clearOutput();
        break;
      case "error":
        this.appendOutput(`$ ${input.trim()}`, result.message);
        break;
    }
  }

  /** Hides all gated sections */
  private hideAllSections(): void {
    if (typeof document === "undefined") return;
    const allGated = document.querySelectorAll<HTMLElement>(".terminal-gated");
    allGated.forEach((el) => {
      el.classList.remove("section--revealed");
    });
  }

  /** Reveals a gated section by removing the hidden state */
  private revealSection(selector: string): void {
    if (typeof document === "undefined") return;
    const sectionName = selector.replace("#", "");
    const gatedEl = document.querySelector<HTMLElement>(`.terminal-gated[data-section="${sectionName}"]`);
    if (gatedEl) {
      gatedEl.classList.add("section--revealed");
    }
  }

  /** Reveals all gated sections at once */
  private revealAllSections(): void {
    if (typeof document === "undefined") return;
    const allGated = document.querySelectorAll<HTMLElement>(".terminal-gated");
    allGated.forEach((el) => {
      el.classList.add("section--revealed");
    });
  }

  /** Smooth scrolls to the target section */
  private scrollToSection(selector: string): void {
    const target = document.querySelector(selector);
    if (target) {
      if (typeof target.scrollIntoView === "function") {
        target.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      this.appendOutput("", "Section not found");
    }
  }

  /** Appends command and output text to the terminal output area */
  private appendOutput(command: string, output: string): void {
    if (!this.outputEl) return;

    const entry = document.createElement("div");
    entry.classList.add("terminal-history-entry");

    if (command) {
      const cmdLine = document.createElement("div");
      cmdLine.classList.add("terminal-history-cmd");
      cmdLine.textContent = command;
      entry.appendChild(cmdLine);
    }

    if (output) {
      const outputLine = document.createElement("pre");
      outputLine.classList.add("terminal-history-output");
      outputLine.textContent = output;
      entry.appendChild(outputLine);
    }

    this.outputEl.appendChild(entry);
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  }

  /** Clears the terminal output area and history */
  private clearOutput(): void {
    if (this.outputEl) {
      this.outputEl.innerHTML = "";
    }
    this.history = [];
  }
}

// Initialize on page load (guard for non-browser environments)
// Note: When using TerminalSite.astro, initialization is handled by that component's script.
// This auto-init is kept for backward compatibility with TerminalNav.astro usage.
// if (typeof document !== "undefined") {
//   document.addEventListener("DOMContentLoaded", () => {
//     new TerminalNav("#terminal-input", "#terminal-output");
//   });
// }
