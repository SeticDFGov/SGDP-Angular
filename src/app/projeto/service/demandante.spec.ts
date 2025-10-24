import { TestBed } from '@angular/core/testing';

import { Demandante } from './demandante';

describe('Demandante', () => {
  let service: Demandante;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Demandante);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
