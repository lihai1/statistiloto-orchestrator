import { Injectable, signal } from '@angular/core';

/**
 * Shared service for contextual AI triggers.
 * Feature components call ask() to request the AI widget
 * to open with a pre-filled message.
 */
@Injectable({ providedIn: 'root' })
export class AgentContextService {
  readonly pendingMessage = signal<string | null>(null);
  readonly openWidget = signal(false);

  /** Open the AI widget with a pre-filled contextual message. */
  ask(message: string): void {
    this.pendingMessage.set(message);
    this.openWidget.set(true);
  }

  /** Called by the widget when it has consumed the pending message. */
  consume(): void {
    this.pendingMessage.set(null);
  }
}
