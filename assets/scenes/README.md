# Admin-curated scene media

Only repository maintainers add licensed media here and update data/scenes.json.
There is no visitor upload, login or CMS. Unknown fields remain null.

- media.type: image or video; null until the media format is chosen.
- media.file: a repository-relative path under assets/scenes/; null until a real file exists.
- media.source: future provenance such as site_owner, licensed or public_domain; currently null.
- media.copyright_status / media.capture_notes: rights and capture documentation; currently null.
- focus_category: distance, intermediate, near or mixed.
- lighting: photopic, mesopic, scotopic or mixed (scene labels, not measured luminance).
- viewing_distance_cm is retained for compatibility and means target_viewing_distance_cm: the distance to the primary viewing target only.
- distance_scope: primary_target_only. This distance does not describe every object in the image.
- Without a single known primary target distance, viewing_distance_cm stays null (including distance/mixed scenes). Never infer a distance from the scene category.
- simulation_status: not_connected; source_type: admin_curated.

No media transformations are applied. Images use img; videos use video controls,
without autoplay. Missing files show a text message. Do not add fake URLs.
The library loads the selected model through the Taiwan catalog and evidence index,
then calls DefocusCalculator.calculate with the primary target distance and evidence record.
The calculator is called only when distance_scope is primary_target_only and the distance is a finite positive number.
The existing calculator currently supports TFNT00/S4 only; supporting another study
requires a separately reviewed calculator capability, not a fallback to TFNT00.

The nested media object is authoritative for rendering. Legacy top-level file and
media_type remain null for compatibility; do not populate them. In particular,
media.file = null never falls back to a legacy path or creates a media element.

UI wording: 主要觀看目標距離：40 cm。此距離僅代表主要觀看目標，不代表畫面中所有物體皆位於相同距離。
