/**
 * Mobile Orb Navigation
 *
 * A persistent floating orb at the bottom center of the viewport on mobile.
 * Tapping the orb expands a radial menu of navigation commands.
 * Tapping a menu item triggers the corresponding terminal command and collapses the menu.
 * Tapping outside or tapping the orb again collapses the menu.
 *
 * The orb hides on scroll-down and reappears on scroll-up.
 */

export function initMobileOrb(): void {
  const orb = document.getElementById("mobile-orb") as HTMLElement | null;
  const menu = document.getElementById("mobile-orb-menu") as HTMLElement | null;
  const overlay = document.getElementById("mobile-orb-overlay") as HTMLElement | null;

  if (!orb || !menu || !overlay) return;

  let isOpen = false;

  // Scroll-hide state
  let lastScrollY = window.scrollY;
  let isHidden = false;
  let scrollTimeout: ReturnType<typeof setTimeout>;

  function open(): void {
    isOpen = true;
    orb!.classList.add("mobile-orb--open");
    menu!.classList.add("mobile-orb-menu--open");
    overlay!.classList.add("mobile-orb-overlay--active");
    orb!.setAttribute("aria-expanded", "true");
  }

  function close(): void {
    isOpen = false;
    orb!.classList.remove("mobile-orb--open");
    menu!.classList.remove("mobile-orb-menu--open");
    overlay!.classList.remove("mobile-orb-overlay--active");
    orb!.setAttribute("aria-expanded", "false");
  }

  function toggle(): void {
    if (isOpen) close();
    else open();
  }

  function hideOrb(): void {
    if (isHidden || isOpen) return;
    isHidden = true;
    orb!.classList.add("mobile-orb--hidden");
  }

  function showOrb(): void {
    if (!isHidden) return;
    isHidden = false;
    orb!.classList.remove("mobile-orb--hidden");
  }

  function onScroll(): void {
    const currentY = window.scrollY;
    const delta = currentY - lastScrollY;

    // Only react to meaningful scroll (> 8px threshold)
    if (Math.abs(delta) < 8) return;

    if (delta > 0 && currentY > 60) {
      // Scrolling down (and not at the very top)
      hideOrb();
    } else {
      // Scrolling up
      showOrb();
    }

    lastScrollY = currentY;

    // Also show after scroll stops (idle)
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(showOrb, 1200);
  }

  // Dispatch a command to the terminal input
  function dispatchCommand(command: string): void {
    const input = document.getElementById("terminal-input") as HTMLInputElement | null;
    if (!input) return;

    // Set the input value and dispatch events so the terminal picks it up
    input.value = command;
    input.dispatchEvent(new Event("input", { bubbles: true }));

    // Simulate Enter key
    const enterEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      bubbles: true,
    });
    input.dispatchEvent(enterEvent);
  }

  // Orb tap
  orb.addEventListener("click", (e) => {
    e.stopPropagation();
    toggle();
  });

  // Overlay tap (close)
  overlay.addEventListener("click", () => {
    close();
  });

  // Menu item taps
  const items = menu.querySelectorAll<HTMLButtonElement>("[data-orb-command]");
  items.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const command = item.getAttribute("data-orb-command");
      if (command) {
        close();
        // Small delay so the close animation plays before scrolling
        setTimeout(() => dispatchCommand(command), 200);
      }
    });
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) close();
  });

  // Scroll behavior
  window.addEventListener("scroll", onScroll, { passive: true });

  // Hide when terminal input is focused (user is typing)
  const terminalInput = document.getElementById("terminal-input");
  if (terminalInput) {
    terminalInput.addEventListener("focus", () => {
      hideOrb();
    });
    terminalInput.addEventListener("blur", () => {
      showOrb();
    });
  }
}
