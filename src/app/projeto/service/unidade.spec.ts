import { TestBed } from '@angular/core/testing';

import { Unidade } from './unidade';

describe('Unidade', () => {
  let service: Unidade;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Unidade);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
