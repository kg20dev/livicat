
### [0.7.2](https://github.com/kg20dev/livicat/compare/v0.7.3...v0.7.2) (2026-06-09)


### Bug Fixes

* sync workflow fixes from release/app to main (Refs [#81](https://github.com/kg20dev/livicat/issues/81)) ([abf949d](https://github.com/kg20dev/livicat/commit/abf949dbfed1b4b76e20ed8819080d9a315cc270))
* use --disable-gpu-compositing for Windows OBS compatibility (Refs [#84](https://github.com/kg20dev/livicat/issues/84)) ([#85](https://github.com/kg20dev/livicat/issues/85)) ([f0e3b95](https://github.com/kg20dev/livicat/commit/f0e3b95d5e2d56eda531ce8f5849d1e2e96f670a))

### [0.7.1](https://github.com/kg20dev/livicat/compare/v0.7.3...v0.7.1) (2026-06-08)

## [0.7.0](https://github.com/kg20dev/livicat/compare/v0.6.1...v0.7.0) (2026-06-08)


### Features

* add analytics event instrumentation (Refs [#61](https://github.com/kg20dev/livicat/issues/61)) ([8d7b0ab](https://github.com/kg20dev/livicat/commit/8d7b0abc26623b13f04da2f8d59ceb46323f72b1))
* add Aptabase analytics module with device ID and event tracking (Refs [#59](https://github.com/kg20dev/livicat/issues/59)) ([ad6e00d](https://github.com/kg20dev/livicat/commit/ad6e00d2e143442675eef62c71b5caa35cdac163))
* add Aptabase debug/release build mode detection (Refs [#67](https://github.com/kg20dev/livicat/issues/67)) ([2f1ef38](https://github.com/kg20dev/livicat/commit/2f1ef3878d0c3574254da9538c00029fe6408bd9))
* add loading screen and analytics consent UI (Refs [#60](https://github.com/kg20dev/livicat/issues/60)) ([216981d](https://github.com/kg20dev/livicat/commit/216981d8cbf1c8feba056b5bcd12f83ec6ad5044))
* implement Aptabase analytics with user persistence and auto-version sync ([e85803c](https://github.com/kg20dev/livicat/commit/e85803ca6f85eb100fcada8d55b8cad8418fb007))
* use official tauri-plugin-aptabase with Tokio runtime guard (Refs [#67](https://github.com/kg20dev/livicat/issues/67)) ([62df939](https://github.com/kg20dev/livicat/commit/62df9395336ba9788953793d15f66427d9c49ca9))


### Bug Fixes

* add .env setup for src-tauri Aptabase key (Refs [#67](https://github.com/kg20dev/livicat/issues/67)) ([0cc3fed](https://github.com/kg20dev/livicat/commit/0cc3fed179a74e76ba811f6de0a8aea7345c3818))
* cast analytics props to satisfy aptabase types (Refs [#67](https://github.com/kg20dev/livicat/issues/67)) ([d4530fc](https://github.com/kg20dev/livicat/commit/d4530fc2c0a1aaf0f09c8d6b1580e6ea9a87b790))
* CSS export now uses native Tauri save dialog; hide unfinished features (Refs [#67](https://github.com/kg20dev/livicat/issues/67)) ([ee5cc3a](https://github.com/kg20dev/livicat/commit/ee5cc3af20c79fb91996dad2d572d171e93b0bac))
* implement custom Tauri command for Aptabase (Refs [#67](https://github.com/kg20dev/livicat/issues/67)) ([5a0ddf0](https://github.com/kg20dev/livicat/commit/5a0ddf0caa36643edd341d303ab1e6998fd0ad5d))
* move app_launched tracking to frontend to avoid Tokio runtime panic (Refs [#67](https://github.com/kg20dev/livicat/issues/67)) ([0acb9ee](https://github.com/kg20dev/livicat/commit/0acb9eedc5c39d127e2d5dfe2e0a0b26a0853a87))
* remove unused import and borrow app_key for plugin (Refs [#67](https://github.com/kg20dev/livicat/issues/67)) ([8784fdb](https://github.com/kg20dev/livicat/commit/8784fdbc19a7c38f0f47d90ed523379e6a31630f))
* satisfy react-hooks/exhaustive-deps lint for onComplete ref ([3d8cd63](https://github.com/kg20dev/livicat/commit/3d8cd632e9e16a6d3cc83a6a97733421e705b8f9))
* update analytics tests to properly verify event props ([596d037](https://github.com/kg20dev/livicat/commit/596d0372ae4046928eb8f39912e61da3dcb39b3d))
* use JS-only @aptabase/tauri instead of Rust plugin (Refs [#67](https://github.com/kg20dev/livicat/issues/67)) ([652c18c](https://github.com/kg20dev/livicat/commit/652c18c72f60a28376092f1b5754fc05d85c944f))
* use platform-specific user agent for preview window ([84cb31f](https://github.com/kg20dev/livicat/commit/84cb31ffd1f4d3fe920b7a2cc2c36ca6f91e1d80))
* use platform-specific user agent for preview window ([1f59a2d](https://github.com/kg20dev/livicat/commit/1f59a2d94056989753bd73da5d9ecd2397e5ef9f))
