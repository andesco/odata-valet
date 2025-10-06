// Cloudflare Worker to serve Bank of Canada exchange rates in OData format
// Supports query string parameters for currency pairs and date ranges

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    // Handle service document request (root) - return HTML URL builder or XML service doc
    if (url.pathname === '/' || url.pathname === '') {
      // If Accept header is specifically for OData/Atom XML (not browser HTML request), return service document
      const acceptHeader = request.headers.get('Accept') || '';
      const prefersHtml = acceptHeader.includes('text/html');
      const prefersODataXml = acceptHeader.includes('application/atom+xml') || acceptHeader.includes('application/atomsvc+xml');

      if (!prefersHtml && prefersODataXml) {
        const serviceDoc = `<?xml version="1.0" encoding="utf-8"?>
<service xml:base="${url.origin}/" xmlns="http://www.w3.org/2007/app" xmlns:atom="http://www.w3.org/2005/Atom">
  <workspace>
    <atom:title>Default</atom:title>
    <collection href="ExchangeRates">
      <atom:title>ExchangeRates</atom:title>
    </collection>
  </workspace>
</service>`;

        return new Response(serviceDoc, {
          headers: {
            'Content-Type': 'application/xml',
            'Access-Control-Allow-Origin': '*',
            'DataServiceVersion': '3.0'
          }
        });
      }

      // Otherwise, serve HTML from assets
      return env.ASSETS.fetch(request);
    }

    // Handle metadata request
    if (url.pathname === '/$metadata') {
      // Extract currencies from query string to generate dynamic metadata
      const qsCurrencies = url.searchParams.get('currencies');

      let currencyColumns = '';
      if (qsCurrencies) {
        const currencies = qsCurrencies.split(',');
        const pairs = [];
        currencies.forEach(curr => {
          pairs.push(`${curr}_CAD`);  // USD:CAD becomes USD_CAD
          pairs.push(`CAD_${curr}`);   // CAD:USD becomes CAD_USD
        });
        currencyColumns = pairs.map(pair =>
          `        <Property Name="${pair}" Type="Edm.Decimal"/>`
        ).join('\n');
      } else {
        // Default columns for root metadata
        currencyColumns = `        <Property Name="USD_CAD" Type="Edm.Decimal"/>
        <Property Name="CAD_USD" Type="Edm.Decimal"/>`;
      }

      const metadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx">
  <edmx:DataServices m:DataServiceVersion="3.0" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata">
    <Schema Namespace="ExchangeRates" xmlns="http://schemas.microsoft.com/ado/2009/11/edm">
      <EntityType Name="ExchangeRate">
        <Key>
          <PropertyRef Name="Id"/>
        </Key>
        <Property Name="Id" Type="Edm.Int32" Nullable="false"/>
        <Property Name="Date" Type="Edm.DateTime" Nullable="false"/>
${currencyColumns}
      </EntityType>
      <EntityContainer Name="ExchangeRatesContainer" m:IsDefaultEntityContainer="true">
        <EntitySet Name="ExchangeRates" EntityType="ExchangeRates.ExchangeRate"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

      return new Response(metadata, {
        headers: {
          'Content-Type': 'application/xml',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Handle ExchangeRates requests with query string parameters
    // /ExchangeRates?currencies=USD&years=5
    // /ExchangeRates?currencies=USD&start=2025-01-01&end=2025-12-31
    if (url.pathname === '/ExchangeRates' || url.pathname === '/ExchangeRates/') {
      const currencies = url.searchParams.get('currencies');
      const years = url.searchParams.get('years');
      const months = url.searchParams.get('months');
      const weeks = url.searchParams.get('weeks');
      const pathStartDate = url.searchParams.get('start');
      const pathEndDate = url.searchParams.get('end');

      // Require currencies parameter
      if (!currencies) {
        return new Response(JSON.stringify({
          error: 'Missing required parameter: currencies',
          example: '/ExchangeRates?currencies=USD&years=5'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // Determine period type and count from direct parameters
      let periodType = null;
      let periodCount = null;
      if (years) {
        periodType = 'years';
        periodCount = years;
      } else if (months) {
        periodType = 'months';
        periodCount = months;
      } else if (weeks) {
        periodType = 'weeks';
        periodCount = weeks;
      }

      // Require a time period
      if (!periodType && !pathStartDate && !pathEndDate) {
        return new Response(JSON.stringify({
          error: 'Missing required time period parameter',
          message: 'Must specify one of: years, months, weeks, or start/end dates',
          examples: [
            '/ExchangeRates?currencies=USD&years=5',
            '/ExchangeRates?currencies=USD&months=6',
            '/ExchangeRates?currencies=USD&weeks=4',
            '/ExchangeRates?currencies=USD&start=2025-01-01&end=2025-12-31'
          ]
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // Check for padding query parameter (default true for all periods)
      const paddingQuery = url.searchParams.get('padding');
      const shouldPad = (paddingQuery !== 'false');
      const padDays = shouldPad ? 7 : 0;

      // Calculate explicit date ranges for all period types
      let startDate, endDate;
      const now = new Date();

      if (periodType && periodCount) {
        // Convert recent periods to explicit date ranges
        endDate = new Date();
        startDate = new Date();

        if (periodType === 'years') {
          startDate.setFullYear(startDate.getFullYear() - parseInt(periodCount));
        } else if (periodType === 'months') {
          startDate.setMonth(startDate.getMonth() - parseInt(periodCount));
        } else if (periodType === 'weeks') {
          startDate.setDate(startDate.getDate() - (parseInt(periodCount) * 7));
        }
      } else if (pathStartDate && pathEndDate) {
        startDate = new Date(pathStartDate);
        endDate = new Date(pathEndDate);
      } else {
        // Default: 5 years
        endDate = new Date();
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 5);
      }

      // Apply padding to start date (7 days before)
      if (padDays > 0) {
        startDate.setDate(startDate.getDate() - padDays);
      }

      // Build currency pairs (both directions)
      const currencyList = currencies.split(',').map(c => c.trim());
      const pairs = [];
      currencyList.forEach(curr => {
        pairs.push(`${curr}:CAD`);
        pairs.push(`CAD:${curr}`);
      });

      const seriesCodes = pairs.map(pair => {
        const [from, to] = pair.split(':');
        return `FX${from}${to}`;
      });

      // Format dates and build date params
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      const dateParams = `start_date=${startDateStr}&end_date=${endDateStr}`;

      const seriesNames = seriesCodes.join(',');
      const bocUrl = `https://www.bankofcanada.ca/valet/observations/${seriesNames}/json?${dateParams}`;

      // Fetch data and return OData XML feed
      try {
        const response = await fetch(bocUrl);
        const data = await response.json();

        if (!data.observations || data.observations.length === 0) {
          const atomError = `<?xml version="1.0" encoding="utf-8"?>
<feed xml:base="${url.origin}/" xmlns="http://www.w3.org/2005/Atom" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata">
  <id>${url.origin}/ExchangeRates</id>
  <title type="text">ExchangeRates</title>
  <updated>${new Date().toISOString()}</updated>
  <link rel="self" title="ExchangeRates" href="ExchangeRates" />
</feed>`;
          return new Response(atomError, {
            status: 404,
            headers: {
              'Content-Type': 'application/atom+xml;type=feed',
              'Access-Control-Allow-Origin': '*',
              'DataServiceVersion': '2.0'
            }
          });
        }

        // Generate entries in wide/pivoted format (one row per date)
        let entryId = 1;
        const entries = [];

        data.observations.forEach((obs) => {
          // Build properties with all currency pairs as columns
          const properties = [];
          properties.push(`        <d:Id m:type="Edm.Int32">${entryId}</d:Id>`);
          properties.push(`        <d:Date m:type="Edm.DateTime">${obs.d}T00:00:00</d:Date>`);

          // Add each currency pair as a separate column
          pairs.forEach((pair, idx) => {
            const seriesCode = seriesCodes[idx];
            const rateValue = obs[seriesCode]?.v;
            const safeColumnName = pair.replace(':', '_'); // USD:CAD becomes USD_CAD
            properties.push(`        <d:${safeColumnName} m:type="Edm.Decimal">${rateValue ? parseFloat(rateValue) : 0.0000}</d:${safeColumnName}>`);
          });

          entries.push(`  <entry>
    <id>${url.origin}/ExchangeRates(${entryId})</id>
    <title type="text">Exchange Rates ${obs.d}</title>
    <updated>${obs.d}T00:00:00Z</updated>
    <author><name /></author>
    <link rel="edit" title="ExchangeRate" href="ExchangeRates(${entryId})" />
    <category term="ExchangeRates.ExchangeRate" scheme="http://schemas.microsoft.com/ado/2007/08/dataservices/scheme" />
    <content type="application/xml">
      <m:properties>
${properties.join('\n')}
      </m:properties>
    </content>
  </entry>`);
          entryId++;
        });

        // Return OData XML format
        const entriesXml = entries.join('\n');
        const atomFeed = `<?xml version="1.0" encoding="utf-8"?>
<feed xml:base="${url.origin}/" xmlns="http://www.w3.org/2005/Atom" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata">
  <id>${url.origin}/ExchangeRates</id>
  <title type="text">ExchangeRates</title>
  <updated>${new Date().toISOString()}</updated>
  <link rel="self" title="ExchangeRates" href="${url.origin}/ExchangeRates" />
${entriesXml}
</feed>`;

        return new Response(atomFeed, {
          headers: {
            'Content-Type': 'application/atom+xml;type=feed',
            'Access-Control-Allow-Origin': '*',
            'DataServiceVersion': '2.0'
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          error: error.message,
          stack: error.stack
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // 404 for all other paths
    return new Response(JSON.stringify({
      error: 'Not Found',
      message: 'Valid endpoints: / (service document), /$metadata, /ExchangeRates?currencies=USD&years=5',
      examples: [
        '/ExchangeRates?currencies=USD&years=5',
        '/ExchangeRates?currencies=USD,EUR&months=6',
        '/ExchangeRates?currencies=USD&weeks=4',
        '/ExchangeRates?currencies=USD&start=2025-01-01&end=2025-12-31'
      ]
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
