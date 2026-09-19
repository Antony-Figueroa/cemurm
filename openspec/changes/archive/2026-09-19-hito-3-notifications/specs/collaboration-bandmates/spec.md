# Delta for Collaboration Bandmates

## MODIFIED Requirements

### Requirement: Add bandmate by unique user ID

The system MUST resolve a unique user ID to a profile and MUST allow inviting the resolved user.

#### Scenario: Add a bandmate by unique user ID

- GIVEN I have a bandmate's unique user ID "USR-8a7f3c"
- WHEN I use "Add by ID" and confirm the invitation
- THEN the app resolves and shows the profile, and the user is invited as a bandmate

### Requirement: Invitation acceptance and revocation

An accepted `bandmate_links` row MUST become active, and INVITEES MUST sync shared setlists. A pending invitation to a removed bandmate MUST NOT be acceptable. (Previously: acceptance created no shared-setlist fan-out beyond the local row; the notification to the inviter clause is now IN — a `notifications` row is emitted to the inviter per change-1 bandmates S5 and Sys1.)

#### Scenario: Bandmate accepts a pending invitation

- GIVEN I invited "Lucia" with status "pending"
- WHEN Lucia accepts
- THEN her status becomes "active", shared setlists sync to her device, and I receive a notification: "Lucia accepted your invitation"

#### Scenario: Removing a bandmate cancels their pending invitation

- GIVEN I invited "Lucia" but removed her from bandmates
- WHEN Lucia tries to accept the invitation
- THEN the app shows "This invitation is no longer valid"

### Requirement: Invitation decline

The system MUST record a declined invitation and MUST surface the decline to the inviter, including via a `notifications` row emitted to the inviter (change-1 bandmates S5 — now IN).

#### Scenario: Bandmate declines a pending invitation

- GIVEN I invited "Lucia"
- WHEN Lucia declines the invitation
- THEN her status becomes "declined", the decline surfaces to me in the declined-outgoing list, and I receive a notification: "Lucia declined your invitation"
