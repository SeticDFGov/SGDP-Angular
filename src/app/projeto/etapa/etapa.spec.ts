import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Etapa } from './etapa';

describe('Etapa', () => {
  let component: Etapa;
  let fixture: ComponentFixture<Etapa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Etapa]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Etapa);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
