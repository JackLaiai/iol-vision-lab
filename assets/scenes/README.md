# Admin-curated scene media

Only repository maintainers add licensed media here and update data/scenes.json.
There is no visitor upload, login or CMS. Unknown fields remain null.

- media_type: image or video; null until the media format is chosen.
- file: a repository-relative path under assets/scenes/; null until a real file exists.
- focus_category: distance, intermediate, near or mixed.
- lighting: photopic, mesopic, scotopic or mixed (scene labels, not measured luminance).
- viewing_distance_cm: a known positive distance or null. Distance/mixed scenes do not imply a single defocus.
- simulation_status: not_connected; source_type: admin_curated.

No media transformations are applied. Images use img; videos use video controls,
without autoplay. Missing files show a text message. Do not add fake URLs.
The library loads the selected model through the Taiwan catalog and evidence index,
then calls DefocusCalculator.calculate with the scene distance and evidence record.
The existing calculator currently supports TFNT00/S4 only; supporting another study
requires a separately reviewed calculator capability, not a fallback to TFNT00.
