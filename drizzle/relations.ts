import { relations } from "drizzle-orm/relations";
import { jeepneyRoutes, jeepneyStops, buildings, rooms, colleges, divisions, classes, eventLocations, dorms, events, adminUsers, editProposals, finalExams, terms, plannerPlans, contributions, floraSpecies, floraSpecimens, roomPositions, eventRouteStops, eventRoutes, contributorProfiles, contributorSocialLinks, contributorProfileAudits } from "./schema";

export const jeepneyStopsRelations = relations(jeepneyStops, ({one}) => ({
	jeepneyRoute: one(jeepneyRoutes, {
		fields: [jeepneyStops.routeId],
		references: [jeepneyRoutes.id]
	}),
}));

export const jeepneyRoutesRelations = relations(jeepneyRoutes, ({many}) => ({
	jeepneyStops: many(jeepneyStops),
}));

export const roomsRelations = relations(rooms, ({one, many}) => ({
	building: one(buildings, {
		fields: [rooms.buildingId],
		references: [buildings.id]
	}),
	college: one(colleges, {
		fields: [rooms.collegeId],
		references: [colleges.id]
	}),
	division: one(divisions, {
		fields: [rooms.divisionId],
		references: [divisions.id]
	}),
	classes: many(classes),
	finalExams: many(finalExams),
	roomPositions: many(roomPositions),
}));

export const buildingsRelations = relations(buildings, ({many}) => ({
	rooms: many(rooms),
	eventLocations: many(eventLocations),
}));

export const collegesRelations = relations(colleges, ({many}) => ({
	rooms: many(rooms),
	divisions: many(divisions),
}));

export const divisionsRelations = relations(divisions, ({one, many}) => ({
	rooms: many(rooms),
	college: one(colleges, {
		fields: [divisions.collegeId],
		references: [colleges.id]
	}),
}));

export const classesRelations = relations(classes, ({one}) => ({
	room: one(rooms, {
		fields: [classes.roomId],
		references: [rooms.id]
	}),
}));

export const eventLocationsRelations = relations(eventLocations, ({one, many}) => ({
	building: one(buildings, {
		fields: [eventLocations.buildingId],
		references: [buildings.id]
	}),
	dorm: one(dorms, {
		fields: [eventLocations.dormId],
		references: [dorms.id]
	}),
	event: one(events, {
		fields: [eventLocations.eventId],
		references: [events.id]
	}),
	eventRouteStops: many(eventRouteStops),
}));

export const dormsRelations = relations(dorms, ({many}) => ({
	eventLocations: many(eventLocations),
}));

export const eventsRelations = relations(events, ({many}) => ({
	eventLocations: many(eventLocations),
	eventRoutes: many(eventRoutes),
}));

export const editProposalsRelations = relations(editProposals, ({one, many}) => ({
	adminUser: one(adminUsers, {
		fields: [editProposals.submitterUserId],
		references: [adminUsers.id]
	}),
	contributions: many(contributions),
}));

export const adminUsersRelations = relations(adminUsers, ({many}) => ({
	editProposals: many(editProposals),
	plannerPlans: many(plannerPlans),
	contributions: many(contributions),
	contributorProfiles: many(contributorProfiles),
	contributorProfileAudits: many(contributorProfileAudits),
}));

export const contributorProfilesRelations = relations(contributorProfiles, ({one, many}) => ({
	adminUser: one(adminUsers, {
		fields: [contributorProfiles.userId],
		references: [adminUsers.id]
	}),
	socialLinks: many(contributorSocialLinks),
	audits: many(contributorProfileAudits),
}));

export const contributorSocialLinksRelations = relations(contributorSocialLinks, ({one}) => ({
	profile: one(contributorProfiles, {
		fields: [contributorSocialLinks.profileId],
		references: [contributorProfiles.id]
	}),
}));

export const contributorProfileAuditsRelations = relations(contributorProfileAudits, ({one}) => ({
	profile: one(contributorProfiles, {
		fields: [contributorProfileAudits.profileId],
		references: [contributorProfiles.id]
	}),
	actor: one(adminUsers, {
		fields: [contributorProfileAudits.actorUserId],
		references: [adminUsers.id]
	}),
}));

export const finalExamsRelations = relations(finalExams, ({one}) => ({
	room: one(rooms, {
		fields: [finalExams.roomId],
		references: [rooms.id]
	}),
	term: one(terms, {
		fields: [finalExams.termId],
		references: [terms.id]
	}),
}));

export const termsRelations = relations(terms, ({many}) => ({
	finalExams: many(finalExams),
}));

export const plannerPlansRelations = relations(plannerPlans, ({one}) => ({
	adminUser: one(adminUsers, {
		fields: [plannerPlans.userId],
		references: [adminUsers.id]
	}),
}));

export const contributionsRelations = relations(contributions, ({one}) => ({
	editProposal: one(editProposals, {
		fields: [contributions.proposalId],
		references: [editProposals.id]
	}),
	adminUser: one(adminUsers, {
		fields: [contributions.userId],
		references: [adminUsers.id]
	}),
}));

export const floraSpecimensRelations = relations(floraSpecimens, ({one}) => ({
	floraSpecy: one(floraSpecies, {
		fields: [floraSpecimens.speciesId],
		references: [floraSpecies.id]
	}),
}));

export const floraSpeciesRelations = relations(floraSpecies, ({many}) => ({
	floraSpecimens: many(floraSpecimens),
}));

export const roomPositionsRelations = relations(roomPositions, ({one}) => ({
	room: one(rooms, {
		fields: [roomPositions.roomId],
		references: [rooms.id]
	}),
}));

export const eventRouteStopsRelations = relations(eventRouteStops, ({one}) => ({
	eventLocation: one(eventLocations, {
		fields: [eventRouteStops.eventLocationId],
		references: [eventLocations.id]
	}),
	eventRoute: one(eventRoutes, {
		fields: [eventRouteStops.routeId],
		references: [eventRoutes.id]
	}),
}));

export const eventRoutesRelations = relations(eventRoutes, ({one, many}) => ({
	eventRouteStops: many(eventRouteStops),
	event: one(events, {
		fields: [eventRoutes.eventId],
		references: [events.id]
	}),
}));