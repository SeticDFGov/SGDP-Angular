import { TestBed } from '@angular/core/testing';

import { Esteira } from './esteira';

describe('Esteira', () => {
  let service: Esteira;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Esteira);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
