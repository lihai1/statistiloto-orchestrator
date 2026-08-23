import { ChangeDetectionStrategy, Component, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CardModule } from 'primeng/card';
import { AgentService, LlmConfigUpdate } from '../../../core/api/agent.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-llm-config',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, SelectModule, CardModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card header="{{ 'admin.llmConfig' | translate }}" styleClass="admin-card">
      <div class="config-form">
        <div class="form-row">
          <label for="provider">{{ 'admin.llmConfig.provider' | translate }}</label>
          <p-select
            inputId="provider"
            [options]="providers"
            optionLabel="label"
            optionValue="value"
            [(ngModel)]="config.provider"
          ></p-select>
        </div>

        <div class="form-row">
          <label for="model">{{ 'admin.llmConfig.model' | translate }}</label>
          <input pInputText id="model" type="text" [(ngModel)]="config.model" />
        </div>

        <div class="form-row">
          <label for="baseUrl">{{ 'admin.llmConfig.baseUrl' | translate }}</label>
          <input pInputText id="baseUrl" type="text" [(ngModel)]="config.baseUrl" placeholder="http://ollama:11434" />
        </div>

        <div class="form-row">
          <label for="apiKey">{{ 'admin.llmConfig.apiKey' | translate }}</label>
          <input pInputText id="apiKey" type="text" [(ngModel)]="config.apiKey"
                 placeholder="Leave empty for Ollama" autocomplete="off" name="llm-api-key-off" />
          <small class="form-hint">Leave empty for Ollama (no API key needed).</small>
        </div>

        <div class="form-row">
          <label for="timeout">{{ 'admin.llmConfig.timeout' | translate }}</label>
          <input pInputText id="timeout" type="number" [(ngModel)]="config.requestTimeoutSeconds" placeholder="300" min="10" max="3600" />
          <small class="form-hint">Seconds (10–3600). Small local models may need 300+.</small>
        </div>

        <p-button
          [label]="'admin.llmConfig.save' | translate"
          (onClick)="save()"
          [loading]="saving()"
          styleClass="mt-3"
        ></p-button>

        @if (statusNote()) {
          <div class="status-note">
            <i class="pi pi-info-circle"></i>
            {{ statusNote() }}
          </div>
        }
      </div>
    </p-card>
  `,
  styles: [`
    .config-form { display: flex; flex-direction: column; gap: 16px; }
    .form-row { display: flex; flex-direction: column; gap: 4px; }
    .form-row label { font-size: 13px; color: var(--text-secondary); font-weight: 500; }
    .form-hint { font-size: 11px; color: var(--text-secondary); opacity: 0.7; }
    .status-note {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: rgba(25, 118, 210, 0.08);
      border-radius: 6px;
      font-size: 13px;
      color: var(--primary);
      margin-top: 12px;
    }
  `],
})
export class LlmConfigComponent implements OnInit {
  private agentService = inject(AgentService);
  private toast = inject(ToastService);
  protected lang = inject(LanguageService);
  private cdr = inject(ChangeDetectorRef);

  providers = [
    { label: 'Ollama', value: 'ollama' },
    { label: 'Gemini', value: 'gemini' },
  ];

  config: LlmConfigUpdate = {
    provider: 'ollama',
    model: 'llama3.1:8b',
    baseUrl: '',
    apiKey: '',
    requestTimeoutSeconds: 300,
  };

  saving = signal(false);
  statusNote = signal<string | null>(null);

  ngOnInit(): void {
    this.agentService.getLlmConfig().subscribe({
      next: (cfg) => {
        this.config.provider = cfg.provider;
        this.config.model = cfg.model;
        if (cfg.base_url) this.config.baseUrl = cfg.base_url;
        if (cfg.api_key) this.config.apiKey = cfg.api_key;
        if (cfg.request_timeout_seconds) this.config.requestTimeoutSeconds = cfg.request_timeout_seconds;
        this.cdr.markForCheck();
      },
      error: () => {}, // silently ignore — may not be configured yet
    });
  }

  save(): void {
    this.saving.set(true);
    this.agentService.updateLlmConfig(this.config).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.statusNote.set(res.note || res.status);
        this.toast.success(this.lang.t('admin.llmConfig.saved'));
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.message ?? this.lang.t('common.error'));
      },
    });
  }
}
