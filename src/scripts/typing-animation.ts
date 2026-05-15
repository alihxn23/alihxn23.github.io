/**
 * Typing Animation Module
 *
 * Character-by-character typing effect with blinking cursor.
 * Used on the hero headline to simulate terminal output on page load.
 */

export interface TypingOptions {
  /** Delay between each character in milliseconds */
  delay?: number;
  /** Whether to show a blinking cursor after typing completes */
  showCursorAfter?: boolean;
}

const DEFAULT_DELAY = 80;

/**
 * Creates a blinking cursor element using the .cursor-blink class from theme.css.
 */
export function createCursor(): HTMLSpanElement {
  const cursor = document.createElement('span');
  cursor.classList.add('cursor-blink');
  cursor.setAttribute('aria-hidden', 'true');
  return cursor;
}

/**
 * Types text into a target element character by character with a blinking cursor.
 *
 * @param target - The DOM element to type into
 * @param text - The text content to type
 * @param options - Configuration options for delay and cursor behavior
 * @returns A promise that resolves when typing is complete
 */
export function typeText(
  target: HTMLElement,
  text: string,
  options: TypingOptions = {}
): Promise<void> {
  const { delay = DEFAULT_DELAY, showCursorAfter = true } = options;

  return new Promise((resolve) => {
    // Clear existing text content (preserve child elements like the prompt symbol)
    const textNode = document.createTextNode('');
    target.appendChild(textNode);

    // Add cursor
    const cursor = createCursor();
    target.appendChild(cursor);

    let index = 0;

    function typeNextChar() {
      if (index < text.length) {
        textNode.textContent += text[index];
        index++;
        setTimeout(typeNextChar, delay);
      } else {
        // Typing complete
        if (!showCursorAfter) {
          cursor.remove();
        }
        resolve();
      }
    }

    typeNextChar();
  });
}

/**
 * Initializes the typing animation on the hero headline.
 * Respects prefers-reduced-motion by showing text immediately.
 */
export function initTypingAnimation(): void {
  const target = document.getElementById('typing-target');
  if (!target) return;

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  // Get the text to type (the name, excluding the $ prompt)
  // The element contains: <span class="terminal-prompt__symbol">$</span> Muhammad Ali Hasan
  const promptSymbol = target.querySelector('.terminal-prompt__symbol');
  const fullText = target.textContent?.trim() ?? '';

  // Extract just the name part (after the $ symbol)
  const promptText = promptSymbol?.textContent?.trim() ?? '';
  const nameText = fullText.replace(promptText, '').trim();

  if (!nameText) return;

  if (prefersReducedMotion) {
    // Show text immediately without animation - content is already in the DOM
    return;
  }

  // Clear the text content but keep the prompt symbol
  // Remove all text nodes from target
  const childNodes = Array.from(target.childNodes);
  for (const node of childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent = '';
    }
  }

  // Remove the name text that was server-rendered (keep the prompt span)
  if (promptSymbol) {
    // Clear everything after the prompt symbol
    while (promptSymbol.nextSibling) {
      promptSymbol.nextSibling.remove();
    }
  }

  // Add a space after the prompt symbol, then type the name
  const spaceNode = document.createTextNode(' ');
  target.appendChild(spaceNode);

  typeText(target, nameText, { delay: 80, showCursorAfter: true });
}

// Initialize on page load (guard for non-browser environments like tests)
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initTypingAnimation);
}
