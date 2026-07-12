import { processCommand, getHelpMessage, COMMANDS } from './terminal-nav.ts';

export function initTerminalSite() {
  // Hide section-data from assistive tech when JS is active
  const sectionData = document.getElementById("section-data");
  if (sectionData) sectionData.setAttribute("aria-hidden", "true");

  const input = document.getElementById("terminal-input") as HTMLInputElement;
  const output = document.getElementById("terminal-output") as HTMLElement;
  const inputLine = document.getElementById("terminal-input-line") as HTMLElement;
  const cursor = document.querySelector(".terminal-input__cursor") as HTMLElement;
  const body = document.getElementById("terminal-body") as HTMLElement;

  if (!input || !output || !inputLine) return;

  const isDesktop = window.matchMedia("(min-width: 768px)").matches;

  // Cursor tracking
  const measure = document.createElement("span");
  measure.setAttribute("aria-hidden", "true");
  measure.style.position = "absolute";
  measure.style.top = "-9999px";
  measure.style.left = "-9999px";
  measure.style.whiteSpace = "pre";
  measure.style.visibility = "hidden";
  measure.style.pointerEvents = "none";
  document.body.appendChild(measure);

  function updateCursor() {
    if (!cursor || !measure || !input) return;
    measure.style.font = getComputedStyle(input).font;
    const text = input.value.substring(0, input.selectionStart || 0);
    measure.textContent = text || "";
    cursor.style.left = `${measure.offsetWidth}px`;
  }

  input.addEventListener("input", updateCursor);
  input.addEventListener("keyup", updateCursor);
  input.addEventListener("click", updateCursor);
  input.addEventListener("focus", updateCursor);

  // --- Rotating placeholder hints ---
  const hintEl = document.getElementById("terminal-hint") as HTMLElement;
  const autocompleteEl = document.getElementById("terminal-autocomplete") as HTMLElement;
  const hintCommands = ["experience", "skills", "certs", "education", "contact", "showall", "help"];
  let hintIndex = 0;
  let hintInterval: ReturnType<typeof setInterval> | null = null;

  function showHint() {
    if (!hintEl) return;
    if (input.value.length > 0) {
      hintEl.textContent = "";
      hintEl.className = "terminal-input__hint";
      return;
    }
    // Slide current hint up and out
    hintEl.classList.add("terminal-input__hint--exit-up");

    setTimeout(() => {
      // Position new hint below, invisible
      hintEl.classList.remove("terminal-input__hint--exit-up");
      hintEl.classList.add("terminal-input__hint--enter-below");
      hintEl.textContent = hintCommands[hintIndex];
      hintIndex = (hintIndex + 1) % hintCommands.length;

      // Force reflow then animate up into place
      void hintEl.offsetHeight;
      hintEl.classList.remove("terminal-input__hint--enter-below");
    }, 350);
  }

  function startHintRotation() {
    showHint();
    hintInterval = setInterval(showHint, 3000);
  }

  function stopHintRotation() {
    if (hintInterval) {
      clearInterval(hintInterval);
      hintInterval = null;
    }
    if (hintEl) {
      hintEl.textContent = "";
      hintEl.className = "terminal-input__hint";
    }
  }

  // --- Tab autocomplete (bash-style) ---
  let lastTabTime = 0;
  const tabDoubleClickThreshold = 500; // ms

  function getMatchingCommands(prefix: string): string[] {
    if (!prefix) return [];
    const lower = prefix.toLowerCase();
    const matches: string[] = [];
    for (const cmd of COMMANDS) {
      if (cmd.name.startsWith(lower) && !matches.includes(cmd.name)) {
        matches.push(cmd.name);
      }
    }
    return matches;
  }

  function updateAutocomplete() {
    if (!autocompleteEl) return;
    const val = input.value;
    if (!val) {
      autocompleteEl.textContent = "";
      return;
    }
    const matches = getMatchingCommands(val);
    if (matches.length === 1 && matches[0] !== val.toLowerCase()) {
      // Show the remaining part as faded suffix, positioned after typed text
      autocompleteEl.textContent = matches[0].substring(val.length);
      measure.style.font = getComputedStyle(input).font;
      measure.textContent = val;
      autocompleteEl.style.left = `${measure.offsetWidth}px`;
    } else {
      autocompleteEl.textContent = "";
    }
  }

  function handleTab(e: KeyboardEvent) {
    if (e.key !== "Tab") return;
    e.preventDefault(); // Prevent focus change

    const val = input.value.trim();
    if (!val) return;

    const matches = getMatchingCommands(val);
    const now = performance.now();

    if (matches.length === 1) {
      // Single match: complete it
      input.value = matches[0];
      updateCursor();
      updateAutocomplete();
    } else if (matches.length > 1) {
      // Multiple matches: double-tab shows all options
      if (now - lastTabTime < tabDoubleClickThreshold) {
        // Double tab — show matching commands in output
        const line = document.createElement("div");
        line.className = "terminal-line terminal-line--output";
        const pre = document.createElement("pre");
        pre.className = "terminal-pre";
        pre.textContent = matches.join("  ");
        line.appendChild(pre);
        output.appendChild(line);
      }
      lastTabTime = now;
    }
  }

  // Wire up hint and autocomplete
  input.addEventListener("input", () => {
    if (input.value.length > 0) {
      stopHintRotation();
    } else {
      startHintRotation();
    }
    updateAutocomplete();
  });

  input.addEventListener("keydown", handleTab);

  // Start hint rotation on load
  startHintRotation();

  // Template map for commands -> section content
  const templateMap: Record<string, string> = {
    experience: "tpl-experience",
    skills: "tpl-skills",
    certs: "tpl-certs",
    education: "tpl-education",
    contact: "tpl-contact",
  };

  function appendCommandLine(cmd: string): HTMLElement {
    const line = document.createElement("div");
    line.className = "terminal-line terminal-line--cmd";
    line.innerHTML = `<span class="text-green">visitor@hxn.sh:~$</span> ${escapeHtml(cmd)}`;
    output.appendChild(line);
    return line;
  }

  function appendOutput(html: string) {
    const line = document.createElement("div");
    line.className = "terminal-line terminal-line--output";
    line.innerHTML = html;
    output.appendChild(line);
  }

  function appendText(text: string) {
    const line = document.createElement("div");
    line.className = "terminal-line terminal-line--output";
    const pre = document.createElement("pre");
    pre.className = "terminal-pre";
    pre.textContent = text;
    line.appendChild(pre);
    output.appendChild(line);
  }

  function renderTemplate(templateId: string) {
    const tpl = document.getElementById(templateId);
    if (!tpl) return;
    const clone = tpl.cloneNode(true) as HTMLElement;
    clone.removeAttribute("id");
    clone.style.display = "";
    const wrapper = document.createElement("div");
    wrapper.className = "terminal-line terminal-line--output";
    // Move children from clone into wrapper
    while (clone.firstChild) {
      wrapper.appendChild(clone.firstChild);
    }
    output.appendChild(wrapper);
  }

  function scrollToNewContent(commandLineEl: HTMLElement | null) {
    // Scroll to the command that was just typed so user sees the output from the top
    if (commandLineEl) {
      commandLineEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function executeCommand(rawInput: string) {
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    const cmdLineEl = appendCommandLine(trimmed);

    const result = processCommand(trimmed);

    if (!result) return;

    switch (result.type) {
      case "navigation": {
        if (result.command!.name === "showall") {
          Object.values(templateMap).forEach((tplId) => renderTemplate(tplId));
          history.replaceState(null, "", "#showall");
        } else {
          const tplId = templateMap[result.command!.name];
          if (tplId) {
            renderTemplate(tplId);
            history.replaceState(null, "", `#${result.command!.name}`);
          } else if (result.command!.name === "about") {
            appendText(`${document.querySelector(".terminal-about")?.textContent || ""}`);
            history.replaceState(null, "", "#about");
          }
        }
        break;
      }
      case "help":
        appendText(result.message);
        break;
      case "clear":
        output.innerHTML = "";
        history.replaceState(null, "", window.location.pathname);
        break;
      case "error":
        appendText(result.message);
        break;
    }

    scrollToNewContent(cmdLineEl);
  }

  // Handle Enter key
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = input.value;
      input.value = "";
      updateCursor();
      updateAutocomplete();
      startHintRotation();
      executeCommand(val);
    }
  });

  // Suggestion buttons
  const suggestions = document.querySelectorAll<HTMLButtonElement>(".terminal-suggestions__btn");
  suggestions.forEach((btn) => {
    btn.addEventListener("click", () => {
      const cmd = btn.dataset.command || "";
      input.value = cmd;
      updateCursor();
      // Auto-execute
      input.value = "";
      updateCursor();
      executeCommand(cmd);
      if (isDesktop) input.focus();
    });
  });

  // Focus input when clicking anywhere in the terminal body (desktop only)
  body.addEventListener("click", (e) => {
    if (!isDesktop) return;
    const target = e.target as HTMLElement;
    if (!target.closest("a") && !target.closest("button") && !target.closest("input")) {
      input.focus();
    }
  });

  // Initial cursor position and focus (desktop only — avoid keyboard popup on mobile)
  updateCursor();
  if (isDesktop) {
    input.focus();
  }

  // Deep linking: auto-execute command from URL hash
  const hash = window.location.hash.replace("#", "").trim();
  if (hash) {
    executeCommand(hash);
  }
}
