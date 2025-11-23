import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExportService, ReportList } from './export.service';
import { ReportService } from '../../service/report.service';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-export-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './export-manager.component.html',
  styleUrls: ['./export-manager.component.css']
})
export class ExportManagerComponent implements OnInit {
  @Input() projectId!: number;
  reportForm = new FormGroup({
    descricao: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    fase: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    data_fim: new FormControl<string>(new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });


  reports: ReportList[] = [];
  isLoading = true;
  isCreating = false;
  error: string | null = null;
  reportId: number | null = null;
  reportStatus: string = '';
  openModal = false;

  constructor(private exportService: ExportService, private reportService: ReportService) { }

  ngOnInit(): void {
    this.fetchReports();
  }
  handleOpenModal(): void {
    this.openModal = true
  }
  handlCloseModal(): void {
    this.openModal = false
  }
  fetchReports(): void {
    if (!this.projectId) return;

    this.isLoading = true;
    this.error = null;
    this.reportService.getReportsByProjetoId(this.projectId).subscribe({
      next: data => {
        this.reports = data;
        this.isLoading = false;
      },
      error: err => {
        this.error = `Falha ao buscar exports: ${err.message}`;
        this.isLoading = false;
      }
    });
  }
  handleCreateReport(): void {
    const payload = {
      ...this.reportForm.getRawValue(),
      NM_PROJETO: this.projectId
    };

    if (payload.data_fim) {
      payload.data_fim = new Date(payload.data_fim).toISOString();
    }
    this.reportService.createReport(payload)
      .subscribe({
        next: (newReport) => {
          this.reportId = newReport.ReportId;
          this.fetchReports();
          this.openModal = false;
        },
        error: (err) => {
          console.error('Falha ao criar o report:', err);
        }
      });
  }
  handleDownloadExport(exportId: number): void {
    const downloadUrl = this.exportService.getDownloadUrl(exportId);
    window.open(downloadUrl, '_blank');
  }
}
