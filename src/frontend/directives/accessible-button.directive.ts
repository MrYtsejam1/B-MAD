import { Directive, ElementRef, HostListener, Input, OnInit } from '@angular/core';

@Directive({
  selector: '[appAccessibleButton]'
})
export class AccessibleButtonDirective implements OnInit {
  @Input() ariaLabel?: string;
  @Input() ariaDescription?: string;

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    const element = this.el.nativeElement;

    if (!element.getAttribute('role')) {
      element.setAttribute('role', 'button');
    }

    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0');
    }

    if (this.ariaLabel) {
      element.setAttribute('aria-label', this.ariaLabel);
    }

    if (this.ariaDescription) {
      const descId = `desc-${Math.random().toString(36).substring(7)}`;
      const descElement = document.createElement('span');
      descElement.id = descId;
      descElement.textContent = this.ariaDescription;
      descElement.style.display = 'none';
      
      element.appendChild(descElement);
      element.setAttribute('aria-describedby', descId);
    }
  }

  @HostListener('keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.el.nativeElement.click();
    }
  }
}
