export type CloudBaseMapMode = "on" | "minimal" | "off";
export type CloudLayerChoice = "total" | "high" | "middle" | "low";

export type CloudDisplaySettings = {
  baseMap: CloudBaseMapMode;
  markOpacity: number;
  markSize: number;
  mapOpacity: number;
  showSolarDirection: boolean;
  showGrid: boolean;
  showLabels: boolean;
  cloudLayer: CloudLayerChoice;
};

type CloudFieldDisplayControlsProps = {
  availableLayers: ReadonlySet<CloudLayerChoice>;
  onChange: (settings: CloudDisplaySettings) => void;
  onOpen?: () => void;
  settings: CloudDisplaySettings;
};

const layers: readonly { value: CloudLayerChoice; label: string }[] = [
  { value: "total", label: "Total" },
  { value: "high", label: "High" },
  { value: "middle", label: "Middle" },
  { value: "low", label: "Low" },
];

export function CloudFieldDisplayControls({
  availableLayers,
  onChange,
  onOpen,
  settings,
}: CloudFieldDisplayControlsProps) {
  const update = <Key extends keyof CloudDisplaySettings>(
    key: Key,
    value: CloudDisplaySettings[Key],
  ) => onChange({ ...settings, [key]: value });

  return (
    <details
      className="cloudDisplaySettings"
      onToggle={(event) => {
        if (event.currentTarget.open) onOpen?.();
      }}
    >
      <summary>Display</summary>
      <div>
        <label>
          <span>Base map</span>
          <select
            aria-label="Cloud Field base map"
            onChange={(event) => update("baseMap", event.target.value as CloudBaseMapMode)}
            value={settings.baseMap}
          >
            <option value="on">On</option>
            <option value="minimal">Minimal</option>
            <option value="off">Off</option>
          </select>
        </label>

        <label>
          <span className="cloudDisplaySettingsLabel">
            Cloud field opacity
            <output>{settings.markOpacity}%</output>
          </span>
          <input
            aria-label="Cloud field opacity"
            max="100"
            min="0"
            onChange={(event) => update("markOpacity", Number(event.target.value))}
            type="range"
            value={settings.markOpacity}
          />
        </label>

        <label>
          <span className="cloudDisplaySettingsLabel">
            Cell contrast
            <output>{settings.markSize}%</output>
          </span>
          <input
            aria-label="Cloud cell contrast"
            max="160"
            min="60"
            onChange={(event) => update("markSize", Number(event.target.value))}
            type="range"
            value={settings.markSize}
          />
        </label>

        <label>
          <span className="cloudDisplaySettingsLabel">
            Map opacity
            <output>{settings.mapOpacity}%</output>
          </span>
          <input
            aria-label="Map opacity"
            max="100"
            min="0"
            onChange={(event) => update("mapOpacity", Number(event.target.value))}
            type="range"
            value={settings.mapOpacity}
          />
        </label>

        <label>
          <span>Cloud layer</span>
          <select
            aria-label="Cloud layer"
            onChange={(event) => update("cloudLayer", event.target.value as CloudLayerChoice)}
            value={settings.cloudLayer}
          >
            {layers.map((layer) => (
              <option
                disabled={!availableLayers.has(layer.value)}
                key={layer.value}
                value={layer.value}
              >
                {layer.label}{availableLayers.has(layer.value) ? "" : " — unavailable"}
              </option>
            ))}
          </select>
        </label>

        <label className="cloudDisplaySettingsCheck">
          <input
            checked={settings.showSolarDirection}
            onChange={(event) => update("showSolarDirection", event.target.checked)}
            type="checkbox"
          />
          Show solar direction
        </label>
        <label className="cloudDisplaySettingsCheck">
          <input
            checked={settings.showGrid}
            onChange={(event) => update("showGrid", event.target.checked)}
            type="checkbox"
          />
          Show sample grid
        </label>
        <label className="cloudDisplaySettingsCheck">
          <input
            checked={settings.showLabels}
            onChange={(event) => update("showLabels", event.target.checked)}
            type="checkbox"
          />
          Show labels
        </label>
      </div>
    </details>
  );
}
