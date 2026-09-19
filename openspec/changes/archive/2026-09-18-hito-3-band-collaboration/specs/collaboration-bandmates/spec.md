# Collaboration Bandmates Specification

## Purpose

Bandmate management from `features/collaboration-bandmates.feature`: username search over the `profiles` identity surface, add-by-user-ID, invite accept/decline, removal, validation edges, and offline-invite fan-out. 9 scenarios IN; email-search defaults deferred (no email column in frozen profiles set) and proximity-code flows are gated on the PR#1 line budget (named deferral table below).

## Requirements

### Requirement: Bandmate search by username

The system MUST search `profiles.username` for authenticated users, displaying username and display name for matches.

#### Scenario: Search and add a bandmate by username

- GIVEN I am on the bandmates screen and "Julian" has username "julian.guitar"
- WHEN I search "julian.guitar" and tap "Add to Band", and Julian accepts
- THEN Julian appears as an active bandmate and shared setlists become visible to him

#### Scenario: Search finds no user

- GIVEN I search for username "nonexistent.user.99"
- WHEN the results return
- THEN no results are found and I see "No user found with that username"

### Requirement: Add bandmate by unique user ID

The system MUST resolve a unique user ID to a profile and MUST allow inviting the resolved user.

#### Scenario: Add a bandmate by unique user ID

- GIVEN I have a bandmate's unique user ID "USR-8a7f3c"
- WHEN I use "Add by ID" and confirm the invitation
- THEN the app resolves and shows the profile, and the user is invited as a bandmate

### Requirement: Invitation acceptance and revocation

An accepted `bandmate_links` row MUST become active, and INVITEES MUST sync shared setlists. A pending invitation to a removed bandmate MUST NOT be acceptable.

#### Scenario: Bandmate accepts a pending invitation

- GIVEN I invited "Lucia" with status "pending"
- WHEN Lucia accepts
- THEN her status becomes "active" and shared setlists sync to her device

#### Scenario: Removing a bandmate cancels their pending invitation

- GIVEN I invited "Lucia" but removed her from bandmates
- WHEN Lucia tries to accept the invitation
- THEN the app shows "This invitation is no longer valid"

### Requirement: Invitation decline

The system MUST record a declined invitation and MUST surface the decline to the inviter.

#### Scenario: Bandmate declines a pending invitation

- GIVEN I invited "Lucia"
- WHEN Lucia declines the invitation
- THEN her status becomes "declined" and the decline surfaces to me in the declined-outgoing list section (the "notification that Lucia declined" clause defers to change 2 — no notification system ships in this change; see Deferred Scenarios, verify Finding 4)

### Requirement: Invitation validation

The system MUST reject self-invites and MUST disable inviting an existing active bandmate.

#### Scenario: Cannot add yourself as a bandmate

- GIVEN I am logged in
- WHEN I search my own username
- THEN my result is excluded from the list and I see "You cannot add yourself"

#### Scenario: Cannot add an existing active bandmate

- GIVEN "Julian" is already an active bandmate
- WHEN I search "julian.guitar"
- THEN Julian appears in the results and the "Add" button is disabled with label "Already in band"

### Requirement: Offline invite while a bandmate is active

The system MUST deliver a shared setlist to active bandmates immediately and MUST leave pending offline bandmates a queued acceptance path.

#### Scenario: Inviting an offline bandmate while another bandmate is active

- GIVEN "Julian" is active and "Marco" is pending and offline
- WHEN I create a shared setlist
- THEN Julian sees the setlist immediately and Marco receives a pending notification for it
- AND when Marco comes online the setlist syncs to him

## Deferred Scenarios

| Scenario | Feature ref | Disposition |
|---|---|---|
| Search and add bandmate by email | bandmates S2 | Default defer — frozen profiles column set has no email; adding `profiles.email` is the upgrade path |
| Proximity code generate, accept-while-offline, sync-when-online, long-offline sync, 24h expiry | bandmates S6–S9, S13 | **Gated**: IN iff PR#1 ≤400 lines (`size:exception` otherwise); codes are `invite_codes(kind='proximity', 24h)` per 0001 |
| Declined-invite notification to the inviter | bandmates S5 (clause "I receive a notification that Lucia declined") | → change 2 (notifications feed/triggers); PR#1a surface is the declined-outgoing list section (verify Finding 4) |