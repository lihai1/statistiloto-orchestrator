import { TestBed } from '@angular/core/testing';
import { LotteryBallComponent } from './lottery-ball.component';

describe('LotteryBallComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LotteryBallComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(LotteryBallComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the number', () => {
    const fixture = TestBed.createComponent(LotteryBallComponent);
    fixture.componentInstance.number = 42;
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('.ball');
    expect(el.textContent.trim()).toBe('42');
  });

  it('should apply variant class', () => {
    const fixture = TestBed.createComponent(LotteryBallComponent);
    fixture.componentInstance.variant = 'strong';
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('.ball');
    expect(el.classList.contains('ball--strong')).toBe(true);
  });

  it('should apply size class', () => {
    const fixture = TestBed.createComponent(LotteryBallComponent);
    fixture.componentInstance.size = 'lg';
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('.ball');
    expect(el.classList.contains('ball--lg')).toBe(true);
  });
});
