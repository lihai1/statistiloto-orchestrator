import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslatePipe } from './translate.pipe';
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  standalone: true,
  imports: [TranslatePipe],
  template: `{{ 'nav.generate' | translate }}`,
})
class HostComponent {}

describe('TranslatePipe', () => {
  let lang: LanguageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
    });
    lang = TestBed.inject(LanguageService);
  });

  it('should translate in Hebrew by default', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('הגרל טופס');
  });

  it('should translate in English after switching', () => {
    lang.setLang('en');
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Generate');
  });

  it('should update already-rendered text when language toggles', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('הגרל טופס');

    lang.setLang('en');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Generate');

    lang.setLang('he');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('הגרל טופס');
  });
});
