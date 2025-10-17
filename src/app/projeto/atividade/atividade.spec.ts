import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Atividade } from './atividade';

describe('Atividade', () => {
  let component: Atividade;
  let fixture: ComponentFixture<Atividade>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Atividade]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Atividade);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
