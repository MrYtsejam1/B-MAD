import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-error-boundary',
  template: `
    <div *ngIf="hasError" class="error-boundary">
      <div class="error-content">
        <h2>{{ errorTitle }}</h2>
        <p>{{ errorMessage }}</p>
        <button *ngIf="retryable" (click)="retry()" class="retry-button">
          Try Again
        </button>
        <button (click)="goHome()" class="home-button">
          Go to Home
        </button>
      </div>
    </div>
    <ng-content *ngIf="!hasError"></ng-content>
  `,
  styles: [`
    .error-boundary {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      padding: 20px;
    }

    .error-content {
      text-align: center;
      max-width: 500px;
    }

    .error-content h2 {
      color: #d32f2f;
      margin-bottom: 16px;
    }

    .error-content p {
      color: #666;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .retry-button,
    .home-button {
      padding: 12px 24px;
      margin: 0 8px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      transition: background-color 0.3s;
    }

    .retry-button {
      background-color: #4CAF50;
      color: white;
    }

    .retry-button:hover {
      background-color: #45a049;
    }

    .home-button {
      background-color: #2196F3;
      color: white;
    }

    .home-button:hover {
      background-color: #0b7dda;
    }
  `]
})
export class ErrorBoundaryComponent implements OnInit {
  @Input() errorTitle = 'Something went wrong';
  @Input() errorMessage = 'An unexpected error occurred. Please try again.';
  @Input() retryable = true;

  hasError = false;

  ngOnInit(): void {
  }

  retry(): void {
    this.hasError = false;
    window.location.reload();
  }

  goHome(): void {
    window.location.href = '/';
  }
}
