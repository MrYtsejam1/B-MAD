import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  private focusableElements = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];

  /**
   * Trap focus within a container (useful for modals)
   */
  trapFocus(container: HTMLElement): () => void {
    const focusableContent = container.querySelectorAll(this.focusableElements.join(','));
    const firstFocusable = focusableContent[0] as HTMLElement;
    const lastFocusable = focusableContent[focusableContent.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            lastFocusable.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            firstFocusable.focus();
            e.preventDefault();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }

  /**
   * Set focus to an element and announce it to screen readers
   */
  setFocus(element: HTMLElement, announce = true): void {
    element.focus();

    if (announce) {
      this.announce(`Focused on ${element.getAttribute('aria-label') || element.textContent || 'element'}`);
    }
  }

  /**
   * Announce a message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcer = this.getOrCreateAnnouncer(priority);
    announcer.textContent = '';
    
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);
  }

  /**
   * Add ARIA labels to elements
   */
  addAriaLabel(element: HTMLElement, label: string): void {
    element.setAttribute('aria-label', label);
  }

  /**
   * Add ARIA description to elements
   */
  addAriaDescription(element: HTMLElement, description: string): void {
    const descId = `desc-${Math.random().toString(36).substring(7)}`;
    const descElement = document.createElement('span');
    descElement.id = descId;
    descElement.textContent = description;
    descElement.style.display = 'none';
    
    element.appendChild(descElement);
    element.setAttribute('aria-describedby', descId);
  }

  /**
   * Enable keyboard navigation for custom components
   */
  enableKeyboardNavigation(container: HTMLElement): void {
    const items = Array.from(container.querySelectorAll('[role="button"], [role="menuitem"]'));
    
    items.forEach((item, index) => {
      const element = item as HTMLElement;
      
      element.addEventListener('keydown', (e: KeyboardEvent) => {
        switch (e.key) {
          case 'ArrowDown':
          case 'ArrowRight':
            e.preventDefault();
            const nextIndex = (index + 1) % items.length;
            (items[nextIndex] as HTMLElement).focus();
            break;
          case 'ArrowUp':
          case 'ArrowLeft':
            e.preventDefault();
            const prevIndex = (index - 1 + items.length) % items.length;
            (items[prevIndex] as HTMLElement).focus();
            break;
          case 'Home':
            e.preventDefault();
            (items[0] as HTMLElement).focus();
            break;
          case 'End':
            e.preventDefault();
            (items[items.length - 1] as HTMLElement).focus();
            break;
          case 'Enter':
          case ' ':
            e.preventDefault();
            element.click();
            break;
        }
      });
    });
  }

  /**
   * Check color contrast ratio
   */
  checkColorContrast(foreground: string, background: string): { ratio: number; passes: boolean } {
    const fgLuminance = this.getLuminance(foreground);
    const bgLuminance = this.getLuminance(background);
    
    const ratio = (Math.max(fgLuminance, bgLuminance) + 0.05) / 
                  (Math.min(fgLuminance, bgLuminance) + 0.05);
    
    const passes = ratio >= 4.5;
    
    return { ratio, passes };
  }

  private getLuminance(color: string): number {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;
    
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private getOrCreateAnnouncer(priority: 'polite' | 'assertive'): HTMLElement {
    const id = `aria-announcer-${priority}`;
    let announcer = document.getElementById(id);
    
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = id;
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', priority);
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.position = 'absolute';
      announcer.style.left = '-10000px';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.overflow = 'hidden';
      document.body.appendChild(announcer);
    }
    
    return announcer;
  }
}
