## Purpose

Lets authenticated marketing team members change copy, SEO and CMS items in both locales through an MCP client, within limits that protect site structure, functionality and child safeguarding.

## ADDED Requirements

### Requirement: Authenticated MCP access
The site SHALL expose the CMS's MCP endpoint to authenticated users only, with authorization through OAuth. Unauthenticated requests SHALL be rejected.

#### Scenario: Unauthenticated call
- **WHEN** an MCP client calls a tool without a valid token
- **THEN** the endpoint responds with an authentication error and performs no action

#### Scenario: Marketing user connects
- **WHEN** a marketing user adds the site's MCP endpoint to their MCP client and completes the OAuth sign-in
- **THEN** the client can list and call the content and media tools

### Requirement: Marketing permissions
Marketing users SHALL be able to read, create, edit, translate, publish, unpublish, schedule and trash content items, copy slot values, page SEO fields and media, in both locales. They SHALL NOT be able to change collections or fields, site settings, users, redirects or plugins, or permanently delete anything.

#### Scenario: Edit migrated item
- **WHEN** a marketing user updates the excerpt of a resource imported by the migration
- **THEN** the update succeeds

#### Scenario: Schema change refused
- **WHEN** a marketing user's client calls a tool that creates a collection or field
- **THEN** the call is refused with an insufficient-permission error

#### Scenario: Permanent delete refused
- **WHEN** a marketing user tries to permanently delete an item
- **THEN** the call is refused and the item stays recoverable

### Requirement: Child safeguarding guard
Creating, editing, publishing, unpublishing, translating or deleting entries in the children collection SHALL be limited to users on a server-side safeguarding allowlist, through both the MCP endpoint and the admin interface. Users not on the allowlist SHALL only be able to read published child profiles, and SHALL never receive a child's private full name. The allowlist SHALL NOT be stored in the repository.

#### Scenario: Marketing edits child
- **WHEN** a marketing user not on the allowlist tries to update or publish a child profile in any locale
- **THEN** the request is rejected with a message explaining that child profiles require safeguarding sign-off

#### Scenario: Safeguarding user edits child
- **WHEN** an allowlisted user updates a child profile
- **THEN** the update succeeds

#### Scenario: Marketing lists children
- **WHEN** a marketing user's client lists or reads child profiles
- **THEN** only published profiles are returned, and none includes the private full name

#### Scenario: Unpublished child hidden
- **WHEN** a marketing user requests an unpublished child profile by id
- **THEN** the request returns not-found

### Requirement: Structural fields protected
Marketing edits to copy slots SHALL be limited to the slot's value. Static page records are maintained by the system and SHALL be read-only for marketing users. Marketing users SHALL NOT create or delete copy slots or static page records.

#### Scenario: Slot metadata change refused
- **WHEN** a marketing user tries to change a copy slot's key, format or maximum length
- **THEN** the request is rejected and the slot is unchanged

### Requirement: Menu links validated
Menu edits SHALL be accepted only when every menu item links to a route that exists on the site in the menu's locale, or to an external URL.

#### Scenario: Broken menu link
- **WHEN** a marketing user sets a menu item to `/es/pagina-que-no-existe`
- **THEN** the edit is rejected naming the invalid link

### Requirement: Recoverable edits
Every published change made by a marketing user SHALL be reversible by restoring an earlier revision, and deleted items SHALL be restorable from trash.

#### Scenario: Undo a copy change
- **WHEN** a marketing user restores the previous revision of a copy slot
- **THEN** the site shows the earlier value on the next request

### Requirement: AI-drafted translations are drafts
A translation created through the MCP endpoint SHALL be saved as a draft and SHALL NOT be visible on the public site until a user publishes it.

#### Scenario: Spanish translation created
- **WHEN** a client creates the Spanish version of an English event
- **THEN** it is stored as a draft linked to the English event, and `/es/events/<slug>` keeps showing the English fallback until it is published
