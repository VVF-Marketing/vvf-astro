## ADDED Requirements

### Requirement: Hero phone image description
The Hero SHALL accept an optional alt text for its phone image. When it is given, phones SHALL show the phone image with that alt text and other widths SHALL show the desktop image with its own alt text. Each width SHALL download only the image it shows. When it is not given, the Hero SHALL behave as before, with one alt text for both images.

#### Scenario: Our Team on a phone
- **WHEN** `/our-team` is viewed at 390 px wide
- **THEN** the visible hero image's alt text describes the phone photo, and the desktop photo is not downloaded

### Requirement: Stacked hero on tablets
The Hero SHALL accept `tablet: 'overlay' | 'stacked'`. With `stacked`, from 768 to 991 px the photo sits on top and the card below it, not over it; the overlay starts at 992 px. The default keeps the overlay from 768 px.

#### Scenario: Home on an iPad
- **WHEN** Home is rendered at 820 px
- **THEN** the hero card starts below the bottom of the hero photo

### Requirement: SVG logos keep a size
The logo slider SHALL give SVG logos the size of their slot, so an SVG saved without width and height stays visible. Raster logos keep their own size within the slot.

#### Scenario: Size-less SVG
- **WHEN** a partner logo is an SVG with only a viewBox
- **THEN** it renders with a non-zero width on a 390 px screen
