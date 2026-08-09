# Sky colour analysis

Sunsetometer classifies a photograph from an explicitly selected sky region,
not from the complete image. A photograph cannot enter the analysis pipeline
until the user draws a crop or deliberately chooses the upper-half preset.

## Primary sky colour

1. The selected crop is downsampled to a maximum edge of 280 pixels.
2. Each visible pixel is converted from sRGB to OKLab.
3. Transparent, near-black and very dark low-chroma pixels are excluded as
   likely foreground or silhouette contamination.
4. The remaining pixels are grouped into as many as five perceptual clusters
   using deterministic k-means in OKLab.
5. Each cluster is scored primarily by its share of included pixels, with a
   modest chroma preference and a penalty for very dark clusters.
6. The centre of the highest-scoring cluster becomes `primarySkyColour`.

The chroma preference is deliberately limited: a small vivid cloud should not
outvote the visually representative body of the selected sky. Confidence
combines the primary cluster’s population share with its score separation from
the next cluster.

Only `primarySkyColour` determines the Sunsetometer sector, chromatic angle and
radial position. SVG coordinates are still derived at render time and are not
stored.

## Preserved evidence

The structured result also retains:

- up to two secondary cluster colours;
- the perceptual average of all included sky pixels;
- the average of the lower 28% of the crop as `horizonColour`;
- the average of the upper 28% as `upperSkyColour`;
- the normalised crop coordinates;
- the primary-colour confidence.

Development mode additionally retains transient visual diagnostics: the
selected crop, an exclusion overlay, cluster centres, population shares, scores
and the chosen primary cluster. These debug images are browser-session data and
are not uploaded or permanently stored.

## Current limitations

Dark-pixel rejection is rule-based rather than semantic segmentation. A crop
containing large bright buildings, water or clouds may still require a tighter
manual selection. Thresholds and cluster scoring are provisional and should be
calibrated against a labelled sunset-image set before scientific claims are
strengthened.
