import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LanguageService);
  });

  it('should default to Hebrew', () => {
    expect(service.lang()).toBe('he');
    expect(service.isRtl()).toBe(true);
  });

  it('should switch to English and set LTR', () => {
    service.setLang('en');
    expect(service.lang()).toBe('en');
    expect(service.isRtl()).toBe(false);
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('should toggle between he and en', () => {
    expect(service.lang()).toBe('he');
    service.toggle();
    expect(service.lang()).toBe('en');
    service.toggle();
    expect(service.lang()).toBe('he');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('should translate keys in the current language', () => {
    expect(service.t('nav.home')).toBe('בית');
    service.setLang('en');
    expect(service.t('nav.home')).toBe('Home');
  });

  it('should interpolate params', () => {
    service.setLang('en');
    expect(service.t('analyze.frequencyOf', { n: 3 })).toBe('Frequency of 3 numbers');
  });

  it('should fall back to key when missing', () => {
    expect(service.t('nonexistent.key')).toBe('nonexistent.key');
  });
});
