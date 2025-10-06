# OData Valet<br /><sub>Bank of Canada Exchange Rate Data in Excel</sub>

**OData Valet** serves an `OData` feed of CAD exchange rate data for use in Excel.

The Bank of Canada [Valet API][Valet] provides exchange rate data in `JSON` and `XML` but these formats are not directly supported in all versions of Excel. OData Valet makes it easier to use Valet API data in Excel:

- converts `JSON` data to [`OData`][Atom]
- includes service discovery for ease of use
- avoid Power Queries Editor
- supports clear `XLOOKUP` formulas

## Usage in Excel

0. [Build your custom URL.](https://odatavalet.andrewe.ca)
1. Select: Get Data ⇢ Odata
2. Enter your URL.
3. Select: Close and load
4. Use `XLOOKUP` to find rates by date.

### Excel Table Structure

The OData feed automatically imports a table in a new `Query` worksheet. Example:

| Id | Date | USD_CAD | CAD_USD |
|----|------|---------|---------|
| 1  | <nobr>2025-01-01</nobr> | 1.2345  | 0.8100 |
| 2  | <nobr>2025-01-02</nobr> | 1.2344  | 0.8101 |

### `XLOOKUP` Function

You can then use `XLOOKUP` in your formulas. Example with `USD:CAD`

```excel
=XLOOKUP(A2, Query[Date], Query[USD_CAD], 0.0000, -1)
```

- date cell: `A2` <small>**OR**</small> `INDEX(A:A,ROW())`
- imported table name: `Query`
- date column: `[Date]`
- exchange rate column: `[USD_CAD]`
- returned value when no match found: `0.0000`
- find previous business day: `-1`

## OData Feed URL

**base url & path**: `odatavalet.andrewe.ca`

**base url & path**: `/ExchangeRates`

**query string**: `?currencies={comma seperated list}&{period}`

- **comma seperated list**\
   `AUD` `BRL` `CHF` `CNY` `EUR` `GBP` `HKD` `IDR` `INR` `JPY` `KRW` `MXN` `MYR` `NOK` `NZD` `PEN` `RUB` `SAR` `SEK` `SGD` `THB` `TRY` `TWD` `USD` `VND` `ZAR`
   > Each currency is includes both exchage directions. Example: `USD,EUR` returns data for four pairs: `USD:CAD` `CAD:USD` `EUR:CAD` `CAD:EUR`

- **period**\
   `years=n`\
   `months=n`\
   `weeks=n`\
   `start=YYYY-MM-DD` `&` `end=YYYY-MM-DD`
   > 7 precedig calendar days are included by default to ensure `XLOOKUP` can find the most recent past rate. Use `padding=false` to disable this.

- **examples**:\
   `?currencies=USD&years=1`\
   `?currencies=USD,EUR,GBP&years=1`\
   `?currencies=USD&start=2025-01-01&end=2025-12-31`

## Data Source

**Bank of Canada**:
   - [Valet API][Valet]
   - [API documentation][API] &middot; [YAML][YAML]

[Atom]:  https://www.odata.org/documentation/odata-version-2-0/atom-format/

[Valet]: https://www.bankofcanada.ca/valet-api-how-to/
[API]:   https://www.bankofcanada.ca/valet/docs
[YAML]:  https://www.bankofcanada.ca/valet/static/swagger/api-en.yml