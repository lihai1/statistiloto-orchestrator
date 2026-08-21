import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { LotteryBallComponent } from '../lottery-ball/lottery-ball.component';

/**
 * Renders an array of lottery numbers as a row of balls.
 * The last number (or the `strong` input) is rendered as the "strong" variant.
 */
@Component({
  selector: 'app-number-set',
  standalone: true,
  imports: [LotteryBallComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="number-set">
      @for (num of regularNumbers; track num; let i = $index) {
        <app-lottery-ball [number]="num" variant="regular" [size]="size" />
      }
      @for (num of strongNumbers; track num) {
        <app-lottery-ball [number]="num" variant="strong" [size]="size" />
      }
    </span>
  `,
  styles: [`
    .number-set {
      display: inline-flex;
      gap: 6px;
      flex-wrap: wrap;
      align-items: center;
    }
  `],
})
export class NumberSetComponent {
  @Input() numbers: number[] = [];
  /** Explicit strong numbers (rendered in the strong variant). */
  @Input() strong: number[] = [];
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  /** When true and no explicit strong numbers, treat the last number as strong. */
  @Input() lastIsStrong = false;

  get regularNumbers(): number[] {
    if (this.strong.length > 0) return this.numbers;
    if (this.lastIsStrong && this.numbers.length > 1) {
      return this.numbers.slice(0, -1);
    }
    return this.numbers;
  }

  get strongNumbers(): number[] {
    if (this.strong.length > 0) return this.strong;
    if (this.lastIsStrong && this.numbers.length > 1) {
      return [this.numbers[this.numbers.length - 1]];
    }
    return [];
  }
}
