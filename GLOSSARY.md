# Victoria Venezuela Foundation site

The foundation's public website and its CMS, and the places it runs: production, where visitors and editors use it, and previews, where pull requests are reviewed.

## Environments

**Production**:
The live site that visitors see and editors change. The only place real child data exists.
_Avoid_: Live, prod (in writing)

**Preview**:
A private copy of the site that runs one pull request's code, for review before merge.
_Avoid_: Staging, preview environment (for one PR's copy)

**Preview database**:
The database of one preview. Copied from the preview parent when its pull request opens, and deleted when it closes.
_Avoid_: PR database, branch database

**Preview parent**:
The database that every new preview database is copied from. It holds public content and stand-in children, never real child data.
_Avoid_: Preview main, template database

## Content

**Public content**:
Content that the live site shows to anyone: every collection except children, plus its media.
_Avoid_: Safe data, non-sensitive data

**Child data**:
Anything that describes a real child: profile entries, their earlier versions and their photos. Exists only in production.
_Avoid_: Kids data, PII (when only children are meant)

**Stand-in children**:
Invented child profiles with placeholder photos, used wherever real child data must not be.
_Avoid_: Fake kids, mock children, dummy data, fixture children (the code's name)

**Seed**:
Loading the content from the repository's seed manifests into an empty database.
_Avoid_: Using "seed" for copying from production

**Preview refresh**:
Replacing the preview parent's public content with production's, then adding stand-in children. Data only goes from production to the preview parent, never back.
_Avoid_: Seeding from production, sync, reset
