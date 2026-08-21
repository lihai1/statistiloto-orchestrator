import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
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
 *  - per-item actions: Analyze, Save (to lucky), Delete
 *  - progressive loading (initial 10, load more on demand)
 */
@Component({
  selector: 'app-number-set-list',
  standalone: true,
  imports: [NumberSetComponent, TranslatePipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="number-set-list">
      @for (item of visible(); track item; let i = $index) {
        <div class="list-item" [class.expanded]="expandedIndex() === i">
          <div class="item-header" (click)="toggleExpand(i)">
            <app-number-set [numbers]="item.numbers" [strong]="item.strong ?? []" size="md" />
            @if (item.count !== undefined) {
              <span class="count-badge">×{{ item.count }}</span>
            }
            <span class="expand-icon">{{ expandedIndex() === i ? '▾' : '▸' }}</span>
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

          @if (showActions) {
            <div class="item-actions">
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
      }

      @if (hasMore()) {
        <button class="load-more" (click)="loadMore()">{{ 'saved.loading' | translate }}</button>
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
    }
    .item-header {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }
    .count-badge {
      background: var(--primary);
      color: #fff;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .expand-icon {
      margin-inline-start: auto;
      color: var(--text-secondary);
      font-size: 14px;
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
    .item-actions {
      margin-top: 8px;
      display: flex;
      gap: 8px;
    }
    .action-btn {
      padding: 4px 12px;
      font-size: 13px;
      border-radius: 4px;
    }
    .action-analyze { background: var(--success); color: #fff; }
    .action-save { background: var(--primary); color: #fff; }
    .action-delete { background: var(--danger); color: #fff; }
    .load-more {
      align-self: center;
      margin-top: 8px;
      padding: 6px 20px;
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-secondary);
    }
  `],
})
export class NumberSetListComponent {
  private readonly _pageSize = 10;
  private _items: NumberSetItem[] = [];
  private _loaded = signal(this._pageSize);

  expandedIndex = signal<number | null>(null);

  @Input() set items(value: NumberSetItem[]) {
    this._items = value ?? [];
    this._loaded.set(this._pageSize);
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
  }
}
