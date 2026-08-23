import { Injectable, computed, signal } from '@angular/core';

export type Lang = 'he' | 'en';

/**
 * Lightweight signal-based i18n service.
 * Hebrew is the default (matching the legacy app). Toggling language also
 * switches the document direction (rtl for Hebrew, ltr for English).
 *
 * Uses a flat dictionary keyed by dot-path strings. Translations are
 * co-located in this service to avoid adding an external dependency.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly _lang = signal<Lang>('he');

  readonly lang = computed(() => this._lang());
  readonly isRtl = computed(() => this._lang() === 'he');

  constructor() {
    this.applyDir();
  }

  setLang(lang: Lang): void {
    this._lang.set(lang);
    this.applyDir();
  }

  toggle(): void {
    this.setLang(this._lang() === 'he' ? 'en' : 'he');
  }

  /** Translate a key, with optional interpolation params. */
  t(key: string, params?: Record<string, string | number>): string {
    const dict = this._lang() === 'he' ? he : en;
    let value = dict[key] ?? en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return value;
  }

  private applyDir(): void {
    const dir = this.isRtl() ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = this._lang();
  }
}

// ── Dictionaries ────────────────────────────────────────────────

const he: Record<string, string> = {
  // ── Nav / shell ──
  'app.title': 'סטטיסטילוטו',
  'nav.home': 'בית',
  'nav.generate': 'הגרל טופס',
  'nav.lucky': 'מספרי מזל',
  'nav.statistics': 'סטטיסטיקה',
  'nav.analyze': 'ניתוח',
  'nav.saved': 'המספרים שלי',
  'auth.login': 'התחבר',
  'auth.logout': 'התנתק',
  'auth.register': 'הרשמה',
  'lang.toggle': 'EN',
  'menu.open': 'תפריט',
  'menu.close': 'סגור',
  'menu.navigation': 'ניווט',
  'menu.archive': 'טווח ארכיון',
  'menu.ai': 'עוזר חכם',
  'menu.admin': 'ניהול',
  'nav.assistant': 'עוזר חכם',
  'nav.admin': 'ניהול',
  'nav.llmConfig': 'הגדרות AI',
  'nav.tokenUsage': 'צריכת טוקנים',
  'nav.auditLog': 'יומן פעולות',
  'nav.scraper': 'הפעלת סקרייפר',
  'assistant.title': 'העוזר החכם',
  'assistant.newChat': 'שיחה חדשה',
  'agent.title': 'עוזר חכם',
  'agent.welcome': 'שאל אותי שאלה על הגרלות, סטטיסטיקה, או מספרים שמורים!',
  'agent.placeholder': 'הקלד שאלה...',
  'agent.thinking': 'חושב...',
  'agent.noResponse': 'לא התקבלה תגובה',
  'agent.approvalRequired': 'נדרש אישור',
  'agent.approvalDesc': 'העוזר רוצה לבצע פעולה שמשנה נתונים. האם לאשר?',
  'agent.approve': 'אשר',
  'agent.reject': 'דחה',
  'agent.approved': 'הפעולה אושרה',
  'agent.rejected': 'הפעולה נדחתה',
  'agent.proposedAction': 'העוזר מציע לבצע פעולה',
  'admin.title': 'ניהול מערכת',
  'admin.llmConfig': 'הגדרות מודל AI',
  'admin.tokenUsage': 'צריכת טוקנים',
  'admin.auditLog': 'יומן פעולות',
  'admin.scraper': 'בקרת סקרייפר',
  'admin.llmConfig.provider': 'ספק',
  'admin.llmConfig.model': 'מודל',
  'admin.llmConfig.baseUrl': 'כתובת בסיס',
  'admin.llmConfig.apiKey': 'מפתח API',
  'admin.llmConfig.timeout': 'טיימאאוט בקשה (שניות)',
  'admin.llmConfig.save': 'שמור הגדרות',
  'admin.llmConfig.saved': 'הגדרות AI נשמרו בהצלחה',
  'admin.tokenUsage.totalTokens': 'סה"כ טוקנים',
  'admin.tokenUsage.totalCost': 'עלות כוללת',
  'admin.tokenUsage.entries': 'רשומות',
  'admin.tokenUsage.refresh': 'רענן',
  'admin.tokenUsage.user': 'משתמש',
  'admin.tokenUsage.tier': 'רמה',
  'admin.tokenUsage.model': 'מודל',
  'admin.tokenUsage.prompt': 'טוקני קלט',
  'admin.tokenUsage.completion': 'טוקני פלט',
  'admin.tokenUsage.cost': 'עלות',
  'admin.tokenUsage.empty': 'אין נתונים עדיין',
  'admin.auditLog.search': 'חיפוש...',
  'admin.auditLog.refresh': 'רענן',
  'admin.auditLog.user': 'משתמש',
  'admin.auditLog.tier': 'רמה',
  'admin.auditLog.action': 'פעולה',
  'admin.auditLog.details': 'פרטים',
  'admin.auditLog.timestamp': 'זמן',
  'admin.auditLog.empty': 'אין רשומות עדיין',
  'admin.scraper.status': 'סטטוס',
  'admin.scraper.idle': 'ממתין',
  'admin.scraper.running': 'פועל...',
  'admin.scraper.trigger': 'הפעל סקרייפר',
  'admin.scraper.approvalDesc': 'הפעלת הסקרייפר תשנה נתונים. האם לאשר?',
  'admin.scraper.triggered': 'הסקרייפר הופעל',
  'admin.scraper.approved': 'הסקרייפר אושר ופעל',
  'admin.scraper.rejected': 'הפעלת הסקרייפר נדחתה',

  // ── Home ──
  'home.title': 'סטטיסטילוטו',
  'home.subtitle': 'ניתוח והגרלת מספרי לוטו על בסיס דפוסים היסטוריים.',
  'home.cta': 'התחל עכשיו',
  'home.action.generate': 'הגרל טופס',
  'home.action.lucky': 'מספרי מזל',
  'home.action.statistics': 'סטטיסטיקה',
  'home.action.analyze': 'נתח מספרים',
  'home.action.saved': 'המספרים שלי',
  'home.action.assistant': 'שאל את העוזר החכם',

  // ── Generate ──
  'generate.title': 'הגרל טופס שיטתי',
  'generate.subtitle': 'הגרל טופס שיטתי עם מספרי המזל שלך. אנחנו מבטיחים שאף טופס מתוכו מעולם לא זכה!',
  'generate.formType': 'סוג טופס',
  'generate.formType.regular': 'רגיל',
  'generate.formType.systematic': 'שיטתי',
  'generate.howMany': 'כמות',
  'generate.includeLucky': 'להוסיף גם את מספרי המזל שלך?',
  'generate.noLucky': 'ללא מספרי מזל',
  'generate.strength': 'עוצמה',
  'generate.strength.strong': 'חזק',
  'generate.strength.weak': 'חלש',
  'generate.button': 'הגרל טופס שמעולם לא זכה',
  'generate.results': 'טפסים שהוגרלו',
  'generate.loading': 'מחשב...',
  'generate.selectMethod': 'בחר את השיטה!',
  'generate.askAI': 'שאל את ה-AI על הטפסים',

  // ── Lucky ──
  'lucky.title': 'מספרי המזל שלי',
  'lucky.subtitle': 'בחר את מספרי המזל שלך (עד 8 מספרים).',
  'lucky.selected': 'מספרי המזל:',
  'lucky.save': 'שמור את מספרי המזל',
  'lucky.limit': 'לא ניתן להוסיף יותר מ-8 מספרי מזל',
  'lucky.saved': 'מספרי המזל נשמרו',

  // ── Statistics ──
  'stats.title': 'סטטיסטיקה',
  'stats.subtitle': 'גלה איזה קבוצה של מספרים הופיעה הכי הרבה.',
  'stats.groupSize': 'גודל קבוצה',
  'stats.howMany': 'כמות קבוצות',
  'stats.strength': 'שכיחות',
  'stats.button': 'חשב',
  'stats.results': 'קבוצות תכופות',
  'stats.loading': 'מחשב...',
  'stats.askAI': 'שאל את ה-AI על הסטטיסטיקה',

  // ── Analyze ──
  'analyze.title': 'ניתוח המספרים',
  'analyze.subtitle': 'הזן את המספרים שלך לניתוח מול הגרלות היסטוריות.',
  'analyze.input': 'המספרים שלך',
  'analyze.placeholder': '1, 2, 3, 4, 5, 6',
  'analyze.button': 'נתח',
  'analyze.frequency': 'שכיחות',
  'analyze.loading': 'מנתח...',
  'analyze.empty': 'הזן לפחות מספר אחד',
  'analyze.tab': 'קבוצת {n}',
  'analyze.selected': 'מספרים שנבחרו',
  'analyze.clear': 'נקה בחירה',
  'analyze.modalTitle': 'ניתוח המספרים',
  'analyze.frequencyOf': 'שכיחות של {n} מספרים',
  'analyze.noResults': 'אין תוצאות',
  'analyze.askAI': 'שאל את ה-AI על הניתוח',

  // ── Saved numbers ──
  'saved.title': 'המספרים שלי',
  'saved.subtitle': 'המספרים והטפסים ששמרת.',
  'saved.forms': 'טפסים שהגרלתי',
  'saved.groups': 'שכיחות של קבוצות מספרים',
  'saved.lucky': 'מספרי המזל שלי',
  'saved.empty': 'אין מספרים שמורים עדיין. הגרל טופס ושמור אותו!',
  'saved.delete': 'מחק',
  'saved.analyze': 'נתח',
  'saved.save': 'הוסף',
  'saved.loading': 'טוען...',

  // ── Archive window ──
  'archive.title': 'טווח ארכיון',
  'archive.from': 'תאריך התחלת ארכיון',
  'archive.to': 'תאריך סוף ארכיון',

  // ── Common ──
  'common.error': 'שגיאה',
  'common.connectionError': 'בעיית חיבור לאינטרנט, אנא נסה שוב',
  'common.close': 'סגור',
  'common.calculate': 'מחשב',
  'common.count': '{count}',
  'common.loadingMore': 'טוען נתונים נוספים...',
};

const en: Record<string, string> = {
  // ── Nav / shell ──
  'app.title': 'Statistiloto',
  'nav.home': 'Home',
  'nav.generate': 'Generate',
  'nav.lucky': 'Lucky',
  'nav.statistics': 'Statistics',
  'nav.analyze': 'Analyze',
  'nav.saved': 'My Numbers',
  'auth.login': 'Login',
  'auth.logout': 'Logout',
  'auth.register': 'Register',
  'lang.toggle': 'עב',
  'menu.open': 'Menu',
  'menu.close': 'Close',
  'menu.navigation': 'Navigation',
  'menu.archive': 'Archive Range',
  'menu.ai': 'AI Assistant',
  'menu.admin': 'Administration',
  'nav.assistant': 'AI Assistant',
  'nav.admin': 'Admin',
  'nav.llmConfig': 'AI Settings',
  'nav.tokenUsage': 'Token Usage',
  'nav.auditLog': 'Audit Log',
  'nav.scraper': 'Scraper Control',
  'assistant.title': 'AI Assistant',
  'assistant.newChat': 'New Chat',
  'agent.title': 'AI Assistant',
  'agent.welcome': 'Ask me about lottery draws, statistics, or your saved numbers!',
  'agent.placeholder': 'Type a question...',
  'agent.thinking': 'Thinking...',
  'agent.noResponse': 'No response received',
  'agent.approvalRequired': 'Approval Required',
  'agent.approvalDesc': 'The assistant wants to perform a data-changing action. Do you approve?',
  'agent.approve': 'Approve',
  'agent.reject': 'Reject',
  'agent.approved': 'Action approved',
  'agent.rejected': 'Action rejected',
  'agent.proposedAction': 'The assistant is proposing an action',
  'admin.title': 'System Administration',
  'admin.llmConfig': 'AI Model Configuration',
  'admin.tokenUsage': 'Token Usage',
  'admin.auditLog': 'Audit Log',
  'admin.scraper': 'Scraper Control',
  'admin.llmConfig.provider': 'Provider',
  'admin.llmConfig.model': 'Model',
  'admin.llmConfig.baseUrl': 'Base URL',
  'admin.llmConfig.apiKey': 'API Key',
  'admin.llmConfig.timeout': 'Request Timeout (seconds)',
  'admin.llmConfig.save': 'Save Settings',
  'admin.llmConfig.saved': 'AI settings saved successfully',
  'admin.tokenUsage.totalTokens': 'Total Tokens',
  'admin.tokenUsage.totalCost': 'Total Cost',
  'admin.tokenUsage.entries': 'Entries',
  'admin.tokenUsage.refresh': 'Refresh',
  'admin.tokenUsage.user': 'User',
  'admin.tokenUsage.tier': 'Tier',
  'admin.tokenUsage.model': 'Model',
  'admin.tokenUsage.prompt': 'Prompt Tokens',
  'admin.tokenUsage.completion': 'Completion Tokens',
  'admin.tokenUsage.cost': 'Cost',
  'admin.tokenUsage.empty': 'No data yet',
  'admin.auditLog.search': 'Search...',
  'admin.auditLog.refresh': 'Refresh',
  'admin.auditLog.user': 'User',
  'admin.auditLog.tier': 'Tier',
  'admin.auditLog.action': 'Action',
  'admin.auditLog.details': 'Details',
  'admin.auditLog.timestamp': 'Timestamp',
  'admin.auditLog.empty': 'No entries yet',
  'admin.scraper.status': 'Status',
  'admin.scraper.idle': 'Idle',
  'admin.scraper.running': 'Running...',
  'admin.scraper.trigger': 'Trigger Scraper',
  'admin.scraper.approvalDesc': 'Triggering the scraper will modify data. Do you approve?',
  'admin.scraper.triggered': 'Scraper triggered',
  'admin.scraper.approved': 'Scraper approved and executed',
  'admin.scraper.rejected': 'Scraper trigger rejected',

  // ── Home ──
  'home.title': 'Statistiloto',
  'home.subtitle': 'Israeli lottery analysis and number generation based on historical patterns.',
  'home.cta': 'Get Started',
  'home.action.generate': 'Generate Forms',
  'home.action.lucky': 'Lucky Numbers',
  'home.action.statistics': 'View Statistics',
  'home.action.analyze': 'Analyze Numbers',
  'home.action.saved': 'My Saved Numbers',
  'home.action.assistant': 'Ask the AI Assistant',

  // ── Generate ──
  'generate.title': 'Generate Systematic Form',
  'generate.subtitle': 'Generate a systematic form with your lucky numbers. We guarantee no form has ever won!',
  'generate.formType': 'Form type',
  'generate.formType.regular': 'Regular',
  'generate.formType.systematic': 'Systematic',
  'generate.howMany': 'How many',
  'generate.includeLucky': 'Include your lucky numbers?',
  'generate.noLucky': 'No lucky numbers',
  'generate.strength': 'Strength',
  'generate.strength.strong': 'Strong',
  'generate.strength.weak': 'Weak',
  'generate.button': 'Generate a form that never won',
  'generate.results': 'Generated Forms',
  'generate.loading': 'Computing...',
  'generate.selectMethod': 'Select method!',
  'generate.askAI': 'Ask AI about these forms',

  // ── Lucky ──
  'lucky.title': 'My Lucky Numbers',
  'lucky.subtitle': 'Pick your lucky numbers (up to 8).',
  'lucky.selected': 'Lucky numbers:',
  'lucky.save': 'Save your lucky numbers',
  'lucky.limit': 'Cannot add more than 8 lucky numbers',
  'lucky.saved': 'Lucky numbers saved',

  // ── Statistics ──
  'stats.title': 'Statistics',
  'stats.subtitle': 'Discover which number groups appeared most frequently.',
  'stats.groupSize': 'Group size',
  'stats.howMany': 'How many groups',
  'stats.strength': 'Frequency',
  'stats.button': 'Calculate',
  'stats.results': 'Frequent Groups',
  'stats.loading': 'Computing...',
  'stats.askAI': 'Ask AI about these statistics',

  // ── Analyze ──
  'analyze.title': 'Analyze Numbers',
  'analyze.subtitle': 'Enter your numbers to analyze against historical draws.',
  'analyze.input': 'Your numbers',
  'analyze.placeholder': '1, 2, 3, 4, 5, 6',
  'analyze.button': 'Analyze',
  'analyze.frequency': 'Frequency',
  'analyze.loading': 'Analyzing...',
  'analyze.empty': 'Please enter at least one number',
  'analyze.tab': 'Group {n}',
  'analyze.selected': 'Selected numbers',
  'analyze.clear': 'Clear selection',
  'analyze.modalTitle': 'Analyze Numbers',
  'analyze.frequencyOf': 'Frequency of {n} numbers',
  'analyze.noResults': 'No results',
  'analyze.askAI': 'Ask AI about this analysis',

  // ── Saved numbers ──
  'saved.title': 'My Numbers',
  'saved.subtitle': 'Your saved numbers and forms.',
  'saved.forms': 'Generated Forms',
  'saved.groups': 'Group Statistics',
  'saved.lucky': 'Lucky Numbers',
  'saved.empty': 'No saved numbers yet. Generate a form and save it!',
  'saved.delete': 'Delete',
  'saved.analyze': 'Analyze',
  'saved.save': 'Add',
  'saved.loading': 'Loading...',

  // ── Archive window ──
  'archive.title': 'Archive Range',
  'archive.from': 'Archive start date',
  'archive.to': 'Archive end date',

  // ── Common ──
  'common.error': 'Error',
  'common.connectionError': 'Connection error, please try again',
  'common.close': 'Close',
  'common.calculate': 'Computing',
  'common.count': '{count}',
  'common.loadingMore': 'Loading more...',
};
