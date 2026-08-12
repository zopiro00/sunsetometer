export function SiteFooter() {
  return (
    <footer className="siteFooter">
      <div className="siteFooterIdentity">
        <p className="sectionLabel">Sunsetometer</p>
        <p>© 2026 Sunsetometer. Working prototype.</p>
        <a href="mailto:info@sunsetometer.com">info@sunsetometer.com</a>
      </div>

      <div className="siteFooterPrivacy">
        <p className="siteFooterLabel">Privacy</p>
        <p>
          Photographs and sky-colour measurements remain in this browser unless
          a future step explicitly asks permission to transmit or store them.
        </p>
      </div>

      <nav aria-label="Data and technical references" className="siteFooterReferences">
        <p className="siteFooterLabel">Data and references</p>
        <ul>
          <li>
            Historical atmosphere: <a href="https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels" rel="noreferrer" target="_blank">Copernicus ERA5 reanalysis</a>
          </li>
          <li>
            Weather access: <a href="https://open-meteo.com/en/docs/historical-weather-api" rel="noreferrer" target="_blank">Open-Meteo Historical Weather API</a>
          </li>
          <li>
            Satellite reference: <a href="https://www.earthdata.nasa.gov/data/tools/worldview" rel="noreferrer" target="_blank">NASA Worldview / GIBS</a>, NOAA-20 VIIRS
          </li>
          <li>
            Base geography: <a href="https://www.naturalearthdata.com/" rel="noreferrer" target="_blank">Natural Earth</a> via world-atlas
          </li>
          <li>Image colour and solar position: calculated locally by Sunsetometer</li>
        </ul>
      </nav>
    </footer>
  );
}
