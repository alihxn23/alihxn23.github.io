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
}

export interface CommandResult {
  type: "navigation" | "help" | "clear" | "error";
  command: CommandDefinition | null;
  message: string;
}

export const COMMANDS: CommandDefinition[] = [
  { name: "about", aliases: ["whoami", "hero"], description: "Who is Muhammad Ali Hasan" },
  { name: "experience", aliases: ["exp", "work"], description: "Professional experience" },
  { name: "skills", aliases: ["tech", "stack"], description: "Technical skills" },
  { name: "certs", aliases: ["certifications", "cert"], description: "Professional certifications" },
  { name: "education", aliases: ["edu", "school"], description: "Education background" },
  { name: "contact", aliases: ["social", "links"], description: "Contact and social links" },
  { name: "showall", aliases: ["cat *", "ls -a", "all"], description: "Reveal all sections" },
  { name: "help", aliases: ["?", "commands"], description: "List available commands" },
  { name: "clear", aliases: ["cls"], description: "Clear terminal history" },
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

// Note: Initialization is handled by TerminalSite.astro's script.
