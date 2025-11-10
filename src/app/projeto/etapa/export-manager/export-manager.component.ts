import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExportService, Export } from './export.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-export-manager',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './export-manager.component.html',
  styleUrls: ['./export-manager.component.css']
})
export class ExportManagerComponent implements OnInit {
  @Input() projectId!: number;

  exports: Export[] = [];
  isLoading = true;
  isCreating = false;
  error: string | null = null;
  reportId: number | null = null;
  reportStatus: string = '';

  constructor(private exportService: ExportService) { }

  ngOnInit(): void {
    this.checkReportExists();
    this.fetchExports();
  }

  checkReportExists(): void {
    if (!this.projectId) return;

    this.exportService.checkReportExists(this.projectId).pipe(
      catchError(err => {
        if (err.status === 404) {
          this.reportStatus = 'AUSENTE';
        } else {
          this.error = 'Falha ao verificar o report.';
        }
        return of(null);
      })
    ).subscribe(report => {
      if (report && report.ReportId) {
        this.reportId = report.ReportId;
      }
    });
  }

  fetchExports(): void {
    if (!this.projectId) return;

    this.isLoading = true;
    this.error = null;
    this.exportService.listExports(this.projectId).subscribe({
      next: data => {
        this.exports = data;
        this.isLoading = false;
      },
      error: err => {
        this.error = `Falha ao buscar exports: ${err.message}`;
        this.isLoading = false;
      }
    });
  }

  handleCreateExport(): void {
    if (!this.reportId) {
      this.error = "O 'reportId' é necessário para criar um export.";
      return;
    }

    this.isCreating = true;
    this.error = null;
    this.exportService.createExport(this.projectId).subscribe({
      next: () => {
        this.fetchExports();
        this.isCreating = false;
      },
      error: err => {
        this.error = `Falha ao criar o export: ${err.message}`;
        this.isCreating = false;
      }
    });
  }

  handleDownloadExport(exportId: number): void {
    const downloadUrl = this.exportService.getDownloadUrl(exportId);
    window.open(downloadUrl, '_blank');
  }
}
