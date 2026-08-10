/**
 * Provider-neutral weather adapters live here. Credentialed providers must
 * remain server-side. Browser adapters are limited to public, no-secret APIs
 * and must preserve source attribution and model/reanalysis provenance.
 */
export { fetchOpenMeteoCloudField } from "./open-meteo-cloud-field";
export { nasaGibsSatelliteImage } from "./nasa-gibs";
