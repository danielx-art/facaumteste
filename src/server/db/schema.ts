import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTableCreator,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `cms_${name}`);

/* ========== USERS ========== */
export const users = createTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  role: varchar("role", { length: 50 }).notNull().default("editor"), // system role: admin|editor|respondent
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
    () => new Date(),
  ),
});

/* ========== ORGANIZATIONS ========== */
export const organizations = createTable("organization", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  ownerId: uuid("owner_id").references(() => users.id, {
    onDelete: "set null",
  }),
  // Org catalog/settings (e.g., catalog policy or allowed subject roots)
  settings: jsonb("settings")
    .$type<{
      catalogPolicy?: {
        allowGlobalSubjects?: boolean;
        allowGlobalSkills?: boolean;
        allowUserSubjects?: boolean;
        allowUserSkills?: boolean;
      };
      allowedSubjectRootIds?: string[]; // subject IDs allowed as roots
    }>()
    .default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const organizationMembers = createTable(
  "organization_member",
  {
    organizationId: uuid("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: varchar("role", { length: 32 }).notNull().default("editor"), // owner|admin|editor|viewer
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    primaryKey({
      columns: [t.organizationId, t.userId],
      name: "org_member_pk",
    }),
    index("org_member_org_idx").on(t.organizationId),
    index("org_member_user_idx").on(t.userId),
  ],
);

/* ========== GROUPS (Turmas) ========== */
export const orgGroups = createTable("org_group", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const orgGroupMembers = createTable(
  "org_group_member",
  {
    groupId: uuid("group_id")
      .references(() => orgGroups.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
   (t) => [
    primaryKey({
      columns: [t.groupId, t.userId],
      name: "org_group_member_pk",
    }),
    index("org_group_member_group_idx").on(t.groupId),
    index("org_group_member_user_idx").on(t.userId),
  ]
);

/* ========== SUBJECTS (Tree, Scoped) ========== */
export const subjects = createTable(
  "subject",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(), // added for UI friendliness
    slug: varchar("slug", { length: 255 }).notNull(), // unique per scope/owner
    description: text("description"),

    // Tree structure
    parentId: uuid("parent_id"),

    // Scope: global | organization | user
    scope: varchar("scope", { length: 20 }).notNull().default("global"),
    ownerOrganizationId: uuid("owner_org_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    ownerUserId: uuid("owner_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    index("subject_scope_idx").on(t.scope),
    index("subject_org_slug_idx").on(t.ownerOrganizationId, t.slug),
    index("subject_user_slug_idx").on(t.ownerUserId, t.slug),
    index("subject_parent_idx").on(t.parentId),
    index("subject_slug_idx").on(t.slug),
  ],
);

/* ========== SKILLS (Flat, Scoped) ========== */
export const skills = createTable(
  "skill",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(), // added for UI friendliness
    slug: varchar("slug", { length: 64 }).notNull(), // e.g., "C1-H1" or any readable code
    description: text("description"),

    // Scope: global | organization | user
    scope: varchar("scope", { length: 20 }).notNull().default("global"),
    ownerOrganizationId: uuid("owner_org_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    ownerUserId: uuid("owner_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    index("skill_scope_idx").on(t.scope),
    index("skill_org_slug_idx").on(t.ownerOrganizationId, t.slug),
    index("skill_user_slug_idx").on(t.ownerUserId, t.slug),
    index("skill_slug_idx").on(t.slug),
  ],
);

/* ========== ITEMS (Independent) ========== */
export const items = createTable(
  "item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: varchar("type", { length: 50 }).notNull(), // mcq_single|mcq_multiple|true_false|true_false_multi|fill_blank|matching
    difficulty: varchar("difficulty", { length: 20 }).default("medium"),

    // Ownership
    ownershipType: varchar("ownership_type", { length: 20 })
      .notNull()
      .default("user"), // user|organization|anonymous
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),

    // Rich content (Lexical AST JSON)
    statement: jsonb("statement").notNull(),
    structure: jsonb("structure").notNull(),
    resolution: jsonb("resolution"),

    // Metadata
    tags: jsonb("tags").$type<string[]>().default([]),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({}),
    usageCount: integer("usage_count").default(0),

    // Status/visibility
    status: varchar("status", { length: 20 }).default("draft"),
    isPublic: boolean("is_public").default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (t) => [
    index("item_type_idx").on(t.type),
    index("item_created_by_idx").on(t.createdBy),
    index("item_org_idx").on(t.organizationId),
    index("item_status_idx").on(t.status),
  ],
);

/* Item Versioning */
export const itemVersions = createTable("item_version", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .references(() => items.id, { onDelete: "cascade" })
    .notNull(),
  version: integer("version").notNull(),
  snapshot: jsonb("snapshot").notNull(), // full item snapshot
  changeDescription: text("change_description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  createdBy: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
});

/* ========== Item <-> Subject / Skill (M:N) ========== */
export const itemSubjects = createTable(
  "item_subject",
  {
    itemId: uuid("item_id")
      .references(() => items.id, { onDelete: "cascade" })
      .notNull(),
    subjectId: uuid("subject_id")
      .references(() => subjects.id, { onDelete: "cascade" })
      .notNull(),
    // Optional: weight/relevance of a subject for this item
    weight: integer("weight").default(1),
  },
  (t) => [
    primaryKey({
      columns: [t.itemId, t.subjectId],
      name: "item_subject_pk",
    }),
    index("item_subject_item_idx").on(t.itemId),
    index("item_subject_subject_idx").on(t.subjectId),
  ],
);

export const itemSkills = createTable(
  "item_skill",
  {
    itemId: uuid("item_id")
      .references(() => items.id, { onDelete: "cascade" })
      .notNull(),
    skillId: uuid("skill_id")
      .references(() => skills.id, { onDelete: "cascade" })
      .notNull(),
    weight: integer("weight").default(1),
  },
  (t) => [
    primaryKey({
      columns: [t.itemId, t.skillId],
      name: "item_skill_pk",
    }),
    index("item_skill_item_idx").on(t.itemId),
    index("item_skill_skill_idx").on(t.skillId),
  ],
);

/* ========== EVALUATIONS (with policies) ========== */
export const evaluations = createTable(
  "evaluation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),

    // Ownership
    ownershipType: varchar("ownership_type", { length: 20 })
      .notNull()
      .default("user"), // user|organization|anonymous
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),

    // Edit Policy
    editPolicy: jsonb("edit_policy")
      .$type<{
        editRoles?: string[]; // for org: ["owner","admin","editor"]
        allowedEditors?: string[]; // extra userIds (ignored if anonymous ownership)
      }>()
      .default({}),

    // Access/Respond Policy
    accessPolicy: jsonb("access_policy")
      .$type<{
        accessMode: "private" | "link" | "public";
        requireAuthToRespond: boolean;
        participantScope: "any" | "org_members" | "groups" | "invited";
        allowedGroups?: string[]; // groupIds
        invitedList?: string[]; // userIds or emails
        linkTokenHash?: string; // required if mode = "link"
        allowAnonymousWhenAuthenticated?: boolean; // logged-in opt-in anonymity
      }>()
      .default({
        accessMode: "private",
        requireAuthToRespond: true,
        participantScope: "any",
      }),

    // Results Policy
    resultsPolicy: jsonb("results_policy")
      .$type<{
        whenToShow: "never" | "afterSubmit" | "afterClose";
        whoSees: "editors" | "respondent_only" | "org_only" | "anyone_with_link";
        viewRoles?: string[]; // for org_only
        pinHash?: string; // in case there's a pin wall
      }>()
      .default({
        whenToShow: "never",
        whoSees: "editors",
      }),

    // Status
    status: varchar("status", { length: 20 }).default("draft"), // draft|published|active|closed

    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (t) => [
    index("evaluation_org_idx").on(t.organizationId),
    index("evaluation_status_idx").on(t.status),
  ],
);

/* Anonymous management (only for ownershipType = "anonymous") */
export const anonymousCreators = createTable("anonymous_creator", {
  id: uuid("id").primaryKey().defaultRandom(),
  evaluationId: uuid("evaluation_id")
    .references(() => evaluations.id, { onDelete: "cascade" })
    .notNull(),
  managementTokenHash: varchar("management_token_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

/* Evaluation <-> Items (M:N) */
export const evaluationItems = createTable(
  "evaluation_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    evaluationId: uuid("evaluation_id")
      .references(() => evaluations.id, { onDelete: "cascade" })
      .notNull(),
    itemId: uuid("item_id")
      .references(() => items.id, { onDelete: "restrict" }) // do not delete item when evaluation is deleted
      .notNull(),
    order: integer("order").notNull(),
    points: integer("points").default(10), // non-binary int
    settings: jsonb("settings").default({}),
  },
  (t) => [
    index("evaluation_item_eval_idx").on(t.evaluationId),
    index("evaluation_item_item_idx").on(t.itemId),
  ],
);

/* ========== RESPONSES (with opt-in anonymity) ========== */
export const responses = createTable(
  "response",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    evaluationId: uuid("evaluation_id")
      .references(() => evaluations.id, { onDelete: "cascade" })
      .notNull(),
    itemId: uuid("item_id")
      .references(() => items.id, { onDelete: "cascade" })
      .notNull(),

    // Respondent identity
    respondentId: uuid("respondent_id").references(() => users.id, {
      onDelete: "set null",
    }),
    respondentSessionId: varchar("respondent_session_id", { length: 64 }),
    isAnonymous: boolean("is_anonymous").notNull().default(false),

    // Answer data
    answer: jsonb("answer").notNull(), // varies by item type
    isCorrect: boolean("is_correct"), // polls etc. may be null
    score: integer("score").default(0),
    timeSpent: integer("time_spent"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    index("response_eval_idx").on(t.evaluationId),
    index("response_item_idx").on(t.itemId),
    index("response_respondent_idx").on(t.respondentId),
    index("response_session_idx").on(t.respondentSessionId),
  ],
);

/* ========== RELATIONS (Drizzle metadata) ========== */
export const usersRelations = relations(users, ({ many }) => ({
  orgMemberships: many(organizationMembers),
  groupMemberships: many(orgGroupMembers),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, { fields: [organizations.ownerId], references: [users.id] }),
  members: many(organizationMembers),
  groups: many(orgGroups),
}));

export const orgGroupsRelations = relations(orgGroups, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [orgGroups.organizationId],
    references: [organizations.id],
  }),
  members: many(orgGroupMembers),
}));

export const orgGroupMembersRelations = relations(orgGroupMembers, ({ one }) => ({
  group: one(orgGroups, {
    fields: [orgGroupMembers.groupId],
    references: [orgGroups.id],
  }),
  user: one(users, {
    fields: [orgGroupMembers.userId],
    references: [users.id],
  }),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  parent: one(subjects, {
    fields: [subjects.parentId],
    references: [subjects.id],
    relationName: "subject_parent",
  }),
  children: many(subjects, { relationName: "subject_parent" }),
  itemLinks: many(itemSubjects),
}));

export const skillsRelations = relations(skills, ({ many }) => ({
  itemLinks: many(itemSkills),
}));

export const itemsRelations = relations(items, ({ many }) => ({
  versions: many(itemVersions),
  subjectLinks: many(itemSubjects),
  skillLinks: many(itemSkills),
  evaluationItems: many(evaluationItems),
  responses: many(responses),
}));

export const itemsOwnerRelations = relations(items, ({ one }) => ({
  organization: one(organizations, {
    fields: [items.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [items.createdBy],
    references: [users.id],
  }),
}));

export const itemVersionsRelations = relations(itemVersions, ({ one }) => ({
  item: one(items, { fields: [itemVersions.itemId], references: [items.id] }),
  editor: one(users, { fields: [itemVersions.createdBy], references: [users.id] }),
}));

export const itemSubjectsRelations = relations(itemSubjects, ({ one }) => ({
  item: one(items, { fields: [itemSubjects.itemId], references: [items.id] }),
  subject: one(subjects, { fields: [itemSubjects.subjectId], references: [subjects.id] }),
}));

export const itemSkillsRelations = relations(itemSkills, ({ one }) => ({
  item: one(items, { fields: [itemSkills.itemId], references: [items.id] }),
  skill: one(skills, { fields: [itemSkills.skillId], references: [skills.id] }),
}));

export const evaluationsRelations = relations(evaluations, ({ one, many }) => ({
  org: one(organizations, {
    fields: [evaluations.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, { fields: [evaluations.createdBy], references: [users.id] }),
  evaluationItems: many(evaluationItems),
}));

export const anonymousCreatorsRelations = relations(anonymousCreators, ({ one }) => ({
  evaluation: one(evaluations, {
    fields: [anonymousCreators.evaluationId],
    references: [evaluations.id],
  }),
}));

export const evaluationItemsRelations = relations(evaluationItems, ({ one }) => ({
  evaluation: one(evaluations, {
    fields: [evaluationItems.evaluationId],
    references: [evaluations.id],
  }),
  item: one(items, { fields: [evaluationItems.itemId], references: [items.id] }),
}));

export const responsesRelations = relations(responses, ({ one }) => ({
  evaluation: one(evaluations, {
    fields: [responses.evaluationId],
    references: [evaluations.id],
  }),
  item: one(items, { fields: [responses.itemId], references: [items.id] }),
  respondent: one(users, { fields: [responses.respondentId], references: [users.id] }),
}));