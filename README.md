# OData Valet<br /><sub>Bank of Canada Exchange Rate Data in Excel</sub>

**OData Valet** serves an `OData` feed of CAD exchange rate data for use in Excel.

The Bank of Canada [Valet API][Valet] provides exchange rate data in `JSON` and `XML` but these formats are not directly supported in all versions of Excel. OData Valet makes it easier to use Valet API data in Excel:

- converts `JSON` data to [`OData`][Atom]
- includes service discovery for ease of use
- avoid Power Queries Editor
- supports clear `XLOOKUP` formulas

### Add Exchange Rate Data to Excel

<h3>
   <ol start="0">
   <li>build and copy your URL:
      <a href="https://odatavalet.andrewe.ca">
         odatavalet.andrewe.ca
      </a>
   <li>select: Get Data → Odata
   <li>paste your URL
   <li>select: Close and load
   <li>use <code>XLOOKUP</code> to find rates by date<br />
   </ol>
</h3>

### Excel Formulas

Use `XLOOKUP` in your exchange rate formulas. Example rate when converting USD to CAD:

```excel
=XLOOKUP(A2, Query[Date], Query[USD_CAD], 0.0000, -1)
```

- date in cell: `A2` <br /><small>**OR**</small><br />dates in column: `INDEX(A:A,ROW())`
- imported table: `Query`
   - date column: `[Date]`
   - exchange rate column: `[USD_CAD]`
- returned value when no match found: `0.0000`
- find previous business day: `-1`

### Excel Table Structure

The OData feed automatically imports (and can sync) a new `Query` worksheet and table. Example:

| Id | Date | USD_CAD | CAD_USD |
|----|------|---------|---------|
| 1  | <nobr>2024-12-31</nobr> | 1.2345  | 0.8100 |
| 2  | <nobr>2025-01-02</nobr> | 1.2344  | 0.8101 |
| 3  | <nobr>2025-01-03</nobr> | 1.2343  | 0.8102 |

## OData Feed URL: [odatavalet.andrewe.ca][public]

**base url & path**: [`odatavalet.andrewe.ca`][public]

**base url & path**: `/ExchangeRates`

**query string**: `?fx={comma seperated list}&{period}`

- **comma seperated list**\
   `AUD` `BRL` `CHF` `CNY` `EUR` `GBP` `HKD` `IDR` `INR` `JPY` `KRW` `MXN` `MYR` `NOK` `NZD` `PEN` `RUB` `SAR` `SEK` `SGD` `THB` `TRY` `TWD` `USD` `VND` `ZAR`
   > Each currency is includes both exchage directions. Example: `USD,EUR` returns data for four pairs: `USD:CAD` `CAD:USD` `EUR:CAD` `CAD:EUR`

- **period**\
   `years=n`\
   `months=n`\
   `weeks=n`\
   `start=YYYY-MM-DD` `&` `end=YYYY-MM-DD`
   > 5 preceeding calendar days are included by default to ensure `XLOOKUP` can find the most recent past rate (accounting for weekends and holidays). Append `&strict` to enforce a strict start date.

- **examples**:\
   [`?fx=USD&weeks=1`](https://odatavalet.andrewe.ca/ExchangeRates?fx=USD&years=1&raw)\
   [`?fx=USD,EUR,GBP&weeks=1&strict`](https://odatavalet.andrewe.ca/ExchangeRates?fx=USD,EUR,GBP&years=1&strict&raw)\
   [`?fx=USD&start=2025-01-01&end=2025-01-03`](https://odatavalet.andrewe.ca/ExchangeRates?fx=USD&start=2025-01-01&end=2025-12-31&raw)
   > These examples link to in-browser `XML` previews. Append `&raw` to view the data in a web browser.

## Data Source

**Bank of Canada**:
   - [Valet API][Valet]
   - [API documentation][API] &middot; [YAML][YAML]


[public]: https://odatavalet.andrewe.ca
[Atom]:   https://www.odata.org/documentation/odata-version-2-0/atom-format/

[Valet]:  https://www.bankofcanada.ca/valet-api-how-to/
[API]:    https://www.bankofcanada.ca/valet/docs
[YAML]:   https://www.bankofcanada.ca/valet/static/swagger/api-en.yml