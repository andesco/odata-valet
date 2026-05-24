import { describe, it, expect } from 'vitest';

const BASE = 'https://odatavalet.andrewe.ca';

describe('worker endpoints', () => {
  it('returns OData XML for valid USD 1-week request', async () => {
    const res = await fetch(`${BASE}/ExchangeRates?fx=USD&weeks=1`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('atom+xml');
    const body = await res.text();
    expect(body).toContain('<feed');
    expect(body).toContain('USD_CAD');
    expect(body).toContain('CAD_USD');
  });

  it('returns correct columns for multi-currency request', async () => {
    const res = await fetch(`${BASE}/ExchangeRates?fx=USD,EUR&months=1`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('EUR_CAD');
    expect(body).toContain('CAD_EUR');
  });

  it('returns 400 when fx parameter is missing', async () => {
    const res = await fetch(`${BASE}/ExchangeRates?weeks=1`);
    expect(res.status).toBe(400);
  });

  it('returns 400 when time period is missing', async () => {
    const res = await fetch(`${BASE}/ExchangeRates?fx=USD`);
    expect(res.status).toBe(400);
  });

  it('returns metadata XML containing USD_CAD property', async () => {
    const res = await fetch(`${BASE}/$metadata?fx=USD`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('USD_CAD');
  });

  it('returns 404 for unknown path', async () => {
    const res = await fetch(`${BASE}/notfound`);
    expect(res.status).toBe(404);
  });

  it('includes CORS header on exchange rate response', async () => {
    const res = await fetch(`${BASE}/ExchangeRates?fx=USD&weeks=1`);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});
