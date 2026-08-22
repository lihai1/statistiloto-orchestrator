import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  signal,
  inject,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { NumberSetComponent } from '../number-set/number-set.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

export interface NumberSetItem {
  id?: number;
  numbers: number[];
  strong?: number[];
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  createdAt?: string;
  count?: number;
}

/**
 * Reusable list of number sets with per-item actions.
 * Ports the legacy `lottery-list` mechanics:
 *  - expandable date metadata (archive start/end, saved date)
 *  - swipeable sliding items with revealed action buttons (analyze, save, delete)
 *  - infinite scroll via IntersectionObserver (replaces the old ion-infinite-scroll)
 */
@Component({
  selector: 'app-number-set-list',
  standalone: true,
  imports: [NumberSetComponent, TranslatePipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="number-set-list">
      @for (item of visible(); track item; let i = $index) {
        <div
          class="list-item"
          [class.expanded]="expandedIndex() === i"
          [class.slid]="slidIndex() === i"
        >
          <div class="item-row"
               (touchstart)="onTouchStart($event, i)"
               (touchend)="onTouchEnd($event, i)"
          >
            <div class="item-content" (click)="toggleExpand(i)">
              <app-number-set [numbers]="item.numbers" [strong]="item.strong ?? []" size="md" />
              @if (item.count !== undefined) {
                <span class="count-badge">×{{ item.count }}</span>
              }
              <span class="expand-icon">{{ expandedIndex() === i ? '▾' : '▸' }}</span>
            </div>

            @if (showActions) {
              <div class="item-actions-inline">
                @if (showAnalyze) {
                  <button class="action-btn action-analyze" (click)="analyze.emit(item); $event.stopPropagation()">
                    {{ 'saved.analyze' | translate }}
                  </button>
                }
                @if (showSave) {
                  <button class="action-btn action-save" (click)="save.emit(item); $event.stopPropagation()">
                    {{ 'saved.save' | translate }}
                  </button>
                }
                @if (showDelete) {
                  <button class="action-btn action-delete" (click)="delete.emit(item); $event.stopPropagation()">
                    {{ 'saved.delete' | translate }}
                  </button>
                }
              </div>
            }
          </div>

          @if (expandedIndex() === i) {
            <div class="item-meta">
              @if (item.dateFrom) {
                <div class="meta-row">
                  <span class="meta-label">{{ 'archive.from' | translate }}:</span>
                  <span>{{ item.dateFrom }}</span>
                </div>
              }
              @if (item.dateTo) {
                <div class="meta-row">
                  <span class="meta-label">{{ 'archive.to' | translate }}:</span>
                  <span>{{ item.dateTo }}</span>
                </div>
              }
              @if (item.createdAt) {
                <div class="meta-row">
                  <span class="meta-label">{{ 'saved.title' | translate }}:</span>
                  <span>{{ item.createdAt | date: 'mediumDate' }}</span>
                </div>
              }
            </div>
          }
        </div>
      }

      @if (hasMore()) {
        <div #sentinel class="scroll-sentinel"></div>
      }
      @if (loadingMore()) {
        <div class="loading-more">
          <span class="spinner"></span>
          <span>{{ 'common.loadingMore' | translate }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .number-set-list { display: flex; flex-direction: column; gap: 8px; }
    .list-item {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px 14px;
      overflow: hidden;
    }
    .item-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .item-content {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      flex: 1;
      min-width: 0;
    }
    .count-badge {
      background: var(--primary);
      color: #fff;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .expand-icon {
      margin-inline-start: auto;
      color: var(--text-secondary);
      font-size: 14px;
      flex-shrink: 0;
    }
    .item-actions-inline {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }
    .item-meta {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .meta-row { display: flex; gap: 8px; font-size: 13px; }
    .meta-label { color: var(--text-secondary); }
    .action-btn {
      padding: 4px 10px;
      font-size: 12px;
      border-radius: 4px;
      white-space: nowrap;
    }
    .action-analyze { background: var(--success); color: #fff; }
    .action-save { background: var(--primary); color: #fff; }
    .action-delete { background: var(--danger); color: #fff; }
    .scroll-sentinel {
      height: 1px;
      width: 100%;
    }
    .loading-more {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      color: var(--text-secondary);
      font-size: 13px;
    }
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Swipeable sliding behavior on touch / narrow screens */
    @media (max-width: 768px) {
      .item-row {
        position: relative;
        touch-action: pan-y;
      }
      .item-actions-inline {
        position: absolute;
        inset-inline-end: 0;
        top: 0;
        bottom: 0;
        transform: translateX(100%);
        transition: transform 0.2s ease;
        margin: 0;
      }
      [dir="rtl"] .item-actions-inline {
        transform: translateX(-100%);
      }
      .list-item.slid .item-actions-inline {
        transform: translateX(0);
      }
    }
  `],
})
export class NumberSetListComponent implements AfterViewInit {
  private readonly _pageSize = 10;
  private _items: NumberSetItem[] = [];
  private _loaded = signal(this._pageSize);

  expandedIndex = signal<number | null>(null);
  slidIndex = signal<number | null>(null);
  loadingMore = signal(false);

  private touchStartX = 0;
  private touchStartY = 0;
  private touchIndex = -1;

  @ViewChild('sentinel', { static: false })
  private sentinelRef?: ElementRef<HTMLElement>;

  private _observer?: IntersectionObserver;

  @Input() set items(value: NumberSetItem[]) {
    this._items = value ?? [];
    this._loaded.set(this._pageSize);
    this.setupObserver();
  }
  @Input() showActions = true;
  @Input() showAnalyze = true;
  @Input() showSave = false;
  @Input() showDelete = true;

  @Output() analyze = new EventEmitter<NumberSetItem>();
  @Output() save = new EventEmitter<NumberSetItem>();
  @Output() delete = new EventEmitter<NumberSetItem>();

  visible() {
    return this._items.slice(0, this._loaded());
  }

  hasMore() {
    return this._loaded() < this._items.length;
  }

  loadMore() {
    this._loaded.update((n) => Math.min(n + this._pageSize, this._items.length));
  }

  toggleExpand(i: number) {
    this.expandedIndex.update((cur) => (cur === i ? null : i));
    this.slidIndex.set(null);
  }

  /** Toggle swipe-revealed actions (touch / mobile). */
  toggleSlide(i: number) {
    this.slidIndex.update((cur) => (cur === i ? null : i));
  }

  /** Track touch start position for swipe detection. */
  onTouchStart(event: TouchEvent, i: number): void {
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.touchIndex = i;
  }

  /** On touch end, detect horizontal swipe and reveal actions. */
  onTouchEnd(event: TouchEvent, i: number): void {
    if (this.touchIndex !== i) return;
    const dx = event.changedTouches[0].clientX - this.touchStartX;
    const dy = event.changedTouches[0].clientY - this.touchStartY;
    // Only trigger on horizontal swipes (>50px) that are more horizontal than vertical
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      this.toggleSlide(i);
    }
    this.touchIndex = -1;
  }

  ngAfterViewInit() {
    this.setupObserver();
  }

  private setupObserver() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = undefined;
    }
    // Defer to next tick so the sentinel element is rendered
    setTimeout(() => {
      const el = this.sentinelRef?.nativeElement;
      if (!el) return;
      this._observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && this.hasMore()) {
              this.loadingMore.set(true);
              // Defer to next tick so the spinner renders before loading
              setTimeout(() => {
                this.loadMore();
                this.loadingMore.set(false);
              }, 50);
            }
          }
        },
        { rootMargin: '100px' },
      );
      this._observer.observe(el);
    }, 50);
  }
}
