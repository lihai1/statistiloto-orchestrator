import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Renders a single lottery number as a modern circular "ball".
 *
 * Variants:
 *  - `regular` — default accent circle
 *  - `strong`  — highlighted (the "strong" / last number, blue in the legacy app)
 *  - `muted`   — subtle background (for pick grids)
 */
@Component({
  selector: 'app-lottery-ball',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="ball ball--{{ variant }} ball--{{ size }}">{{ number }}</span>`,
  styles: [`
    .ball {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-weight: 700;
      font-size: 14px;
      line-height: 1;
      user-select: none;
      flex-shrink: 0;
    }
    .ball--sm { width: 28px; height: 28px; font-size: 12px; }
    .ball--md { width: 36px; height: 36px; font-size: 14px; }
    .ball--lg { width: 44px; height: 44px; font-size: 16px; }

    .ball--regular {
      background: var(--ball-regular, #e53935);
      color: #fff;
    }
    .ball--strong {
      background: var(--ball-strong, #1976d2);
      color: #fff;
    }
    .ball--muted {
      background: var(--ball-muted, #eceff1);
      color: var(--text);
      border: 1px solid var(--border);
    }
  `],
})
export class LotteryBallComponent {
  @Input() number: number | string = 0;
  @Input() variant: 'regular' | 'strong' | 'muted' = 'regular';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
}
