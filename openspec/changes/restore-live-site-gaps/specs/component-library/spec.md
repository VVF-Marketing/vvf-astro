## ADDED Requirements

### Requirement: Hero phone image description
The Hero SHALL accept an optional alt text for its phone image. When it is given, phones SHALL show the phone image with that alt text and other widths SHALL show the desktop image with its own alt text. Each width SHALL download only the image it shows. When it is not given, the Hero SHALL behave as before, with one alt text for both images.

#### Scenario: Our Team on a phone
- **WHEN** `/our-team` is viewed at 390 px wide
- **THEN** the visible hero image's alt text describes the phone photo, and the desktop photo is not downloaded
