import { randomUUID } from 'crypto';
import { db } from '../../database/client';
import {
  AuditLog,
  Invitation,
  Membership,
  Organization,
  OrganizationMember,
  OrganizationRole,
  OrganizationSummary,
  OrganizationType,
  OrganizationSeatSnapshot,
  StyleProfile,
  UsageRecord,
  User,
} from '../../types';
import { auditService } from '../audit/audit.service';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

const PERSONAL_ORG_PREFIX = 'personal';

const rolesHierarchy: Record<OrganizationRole, number> = {
  owner: 4,
  admin: 3,
  author: 2,
  viewer: 1,
};

class OrganizationService {
  async ensurePersonalWorkspace(user: User): Promise<Organization> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    const existingMembership = db.data.memberships.find(
      membership =>
        membership.userId === user.id &&
        membership.status === 'active' &&
        this.getOrganizationByIdSync(membership.organizationId)?.type === 'personal',
    );

    if (existingMembership) {
      const organization = this.getOrganizationByIdSync(existingMembership.organizationId);
      if (!organization) {
        throw new Error('Personal organization reference missing');
      }
      return organization;
    }

    const now = new Date().toISOString();
    const organization: Organization = {
      id: `org_${randomUUID()}`,
      name: user.name ? `${user.name.split(' ')[0]}'s Workspace` : 'Personal Workspace',
      slug: `${PERSONAL_ORG_PREFIX}-${slugify(user.id)}`,
      type: 'personal',
      planId: 'scribe-free',
      createdAt: now,
      updatedAt: now,
      createdBy: user.id,
      billingEmail: user.email,
    };

    const membership: Membership = {
      id: `mem_${randomUUID()}`,
      organizationId: organization.id,
      userId: user.id,
      role: 'owner',
      status: 'active',
      joinedAt: now,
      lastActiveAt: now,
    };

    db.data.organizations.push(organization);
    db.data.memberships.push(membership);
    await db.write();

    await auditService.record({
      organizationId: organization.id,
      actorId: user.id,
      action: 'organization.created',
      targetType: 'organization',
      targetId: organization.id,
      metadata: { type: 'personal' },
    });

    return organization;
  }

  async listSummariesForUser(userId: string): Promise<OrganizationSummary[]> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    const memberships = db.data.memberships.filter(
      membership => membership.userId === userId && membership.status === 'active',
    );

    const summaries: OrganizationSummary[] = [];
    for (const membership of memberships) {
      const organization = this.getOrganizationByIdSync(membership.organizationId);
      if (!organization) continue;
      const seats = await this.getSeatSnapshot(organization.id);
      const subscription = await this.getLatestSubscriptionForOrganization(organization.id);
      summaries.push({ organization, membership, seats, subscription });
    }
    return summaries.sort((a, b) => new Date(b.organization.createdAt).getTime() - new Date(a.organization.createdAt).getTime());
  }

  async resolveActiveOrganizationId(userId: string): Promise<string | undefined> {
    const summaries = await this.listSummariesForUser(userId);
    if (summaries.length === 0) {
      return undefined;
    }
    const personal = summaries.find(summary => summary.organization.type === 'personal');
    return personal?.organization.id ?? summaries[0].organization.id;
  }

  async assertRole(
    userId: string,
    organizationId: string,
    allowedRoles: OrganizationRole[],
  ): Promise<Membership> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }
    const membership = db.data.memberships.find(
      member => member.userId === userId && member.organizationId === organizationId && member.status === 'active',
    );
    if (!membership) {
      throw new Error('You are not a member of this organization.');
    }
    if (!allowedRoles.includes(membership.role)) {
      throw new Error('You do not have permission to perform this action.');
    }
    return membership;
  }

  async createOrganization(userId: string, name: string, planId = 'scribe-pro'): Promise<OrganizationSummary> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    const now = new Date().toISOString();
    const organization: Organization = {
      id: `org_${randomUUID()}`,
      name,
      slug: slugify(name),
      type: 'team',
      planId,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    };

    const membership: Membership = {
      id: `mem_${randomUUID()}`,
      organizationId: organization.id,
      userId,
      role: 'owner',
      status: 'active',
      joinedAt: now,
      lastActiveAt: now,
    };

    db.data.organizations.push(organization);
    db.data.memberships.push(membership);
    await db.write();

    await auditService.record({
      organizationId: organization.id,
      actorId: userId,
      action: 'organization.created',
      targetType: 'organization',
      targetId: organization.id,
      metadata: { planId },
    });

    const seats = await this.getSeatSnapshot(organization.id);
    const subscription = await this.getLatestSubscriptionForOrganization(organization.id);
    return { organization, membership, seats, subscription };
  }

  async getMembers(organizationId: string): Promise<OrganizationMember[]> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }
    return db.data.memberships
      .filter(member => member.organizationId === organizationId)
      .map(member => ({
        membership: member,
        user: db.data?.users.find(u => u.id === member.userId) ?? null,
      }))
      .sort((a, b) => (rolesHierarchy[b.membership.role] - rolesHierarchy[a.membership.role]));
  }

  async inviteMember(params: {
    organizationId: string;
    inviterId: string;
    email: string;
    role: OrganizationRole;
    expiresInDays?: number;
  }): Promise<Invitation> {
    const { organizationId, inviterId, email, role, expiresInDays = 14 } = params;
    const seats = await this.getSeatSnapshot(organizationId);
    if (typeof seats.limit === 'number' && seats.used >= seats.limit) {
      throw new Error('Seat limit reached. Upgrade your plan to invite more teammates.');
    }

    await this.assertRole(inviterId, organizationId, ['owner', 'admin']);

    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    const existingInvitation = db.data.invitations.find(
      invitation => invitation.organizationId === organizationId && invitation.email === email && invitation.status === 'pending',
    );
    if (existingInvitation) {
      return existingInvitation;
    }

    const now = new Date();
    const invitation: Invitation = {
      id: `inv_${randomUUID()}`,
      organizationId,
      email: email.toLowerCase(),
      role,
      inviterId,
      token: randomUUID(),
      expiresAt: new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      createdAt: now.toISOString(),
    };

    db.data.invitations.push(invitation);
    await db.write();

    await auditService.record({
      organizationId,
      actorId: inviterId,
      action: 'organization.invite.created',
      targetType: 'invitation',
      targetId: invitation.id,
      metadata: { email: invitation.email, role: invitation.role },
    });

    return invitation;
  }

  async listInvitations(organizationId: string): Promise<Invitation[]> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }
    return db.data.invitations
      .filter(invite => invite.organizationId === organizationId && invite.status === 'pending')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async acceptInvitation(token: string, userId: string): Promise<{ organization: Organization; membership: Membership }> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }
    const invitation = db.data.invitations.find(inv => inv.token === token && inv.status === 'pending');
    if (!invitation) {
      throw new Error('Invitation not found or already accepted.');
    }
    if (new Date(invitation.expiresAt).getTime() < Date.now()) {
      invitation.status = 'expired';
      invitation.resolvedAt = new Date().toISOString();
      await db.write();
      throw new Error('Invitation has expired.');
    }

    const organization = this.getOrganizationByIdSync(invitation.organizationId);
    if (!organization) {
      throw new Error('Organization not found.');
    }

    const existingMembership = db.data.memberships.find(
      member => member.userId === userId && member.organizationId === organization.id,
    );
    if (existingMembership && existingMembership.status === 'active') {
      invitation.status = 'revoked';
      invitation.resolvedAt = new Date().toISOString();
      await db.write();
      return { organization, membership: existingMembership };
    }

    const now = new Date().toISOString();
    const membership: Membership = existingMembership
      ? { ...existingMembership, role: invitation.role, status: 'active', joinedAt: existingMembership.joinedAt ?? now }
      : {
          id: `mem_${randomUUID()}`,
          organizationId: organization.id,
          userId,
          role: invitation.role,
          status: 'active',
          joinedAt: now,
          lastActiveAt: now,
        };

    if (existingMembership) {
      Object.assign(existingMembership, membership);
    } else {
      db.data.memberships.push(membership);
    }

    invitation.status = 'accepted';
    invitation.resolvedAt = now;
    await db.write();

    await auditService.record({
      organizationId: organization.id,
      actorId: userId,
      action: 'organization.invite.accepted',
      targetType: 'membership',
      targetId: membership.id,
      metadata: { email: invitation.email, role: invitation.role },
    });

    return { organization, membership };
  }

  async updateMemberRole(
    actorId: string,
    organizationId: string,
    memberId: string,
    role: OrganizationRole,
  ): Promise<Membership> {
    await this.assertRole(actorId, organizationId, ['owner', 'admin']);
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    const membership = db.data.memberships.find(mem => mem.id === memberId && mem.organizationId === organizationId);
    if (!membership) {
      throw new Error('Membership not found.');
    }

    membership.role = role;
    membership.lastActiveAt = new Date().toISOString();
    await db.write();

    await auditService.record({
      organizationId,
      actorId,
      action: 'organization.member.updated',
      targetType: 'membership',
      targetId: memberId,
      metadata: { role },
    });

    return membership;
  }

  async removeMember(actorId: string, organizationId: string, memberId: string): Promise<void> {
    await this.assertRole(actorId, organizationId, ['owner', 'admin']);
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }
    const membershipIndex = db.data.memberships.findIndex(
      mem => mem.id === memberId && mem.organizationId === organizationId,
    );
    if (membershipIndex === -1) {
      throw new Error('Membership not found.');
    }
    const [removed] = db.data.memberships.splice(membershipIndex, 1);
    await db.write();

    await auditService.record({
      organizationId,
      actorId,
      action: 'organization.member.removed',
      targetType: 'membership',
      targetId: removed.id,
      metadata: { userId: removed.userId },
    });
  }

  async seedSandboxData(
    actorId: string,
    organizationId: string,
  ): Promise<{
    seededAt: string;
    membersSeeded: number;
    profilesCreated: number;
    usageRecordsCreated: number;
    auditEventsCreated: number;
  }> {
    await this.assertRole(actorId, organizationId, ['owner', 'admin']);
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    const organization = this.getOrganizationByIdSync(organizationId);
    if (!organization) {
      throw new Error('Organization not found.');
    }

    const seededAt = new Date().toISOString();
    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const toMonthKey = (date: Date) => `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;

    const activeMemberships = db.data.memberships.filter(
      membership => membership.organizationId === organizationId && membership.status === 'active',
    );

    if (activeMemberships.length === 0) {
      throw new Error('Add at least one active member before generating sandbox data.');
    }

    const memberUserIds = new Set(activeMemberships.map(member => member.userId));
    const sandboxProfilePrefix = 'Demo — ';
    const membersSeeded = activeMemberships.reduce((count, membership) => {
      const user = db.data!.users.find(item => item.id === membership.userId);
      return user ? count + 1 : count;
    }, 0);

    db.data.style_profiles = db.data.style_profiles.filter(
      profile => !(memberUserIds.has(profile.userId) && profile.name.startsWith(sandboxProfilePrefix)),
    );

    let profilesCreated = 0;
    let totalGoogleSamples = 0;
    let totalFacebookSamples = 0;

    activeMemberships.forEach((membership, index) => {
      const user = db.data!.users.find(item => item.id === membership.userId);
      if (!user) {
        return;
      }

      const googleSamples = randomInt(120, 260);
      const facebookSamples = randomInt(60, 140);

      user.google = {
        id: user.google?.id ?? `sandbox-google-${user.id}`,
        accessToken: `sandbox:google:${googleSamples}`,
      };

      user.facebook = {
        id: user.facebook?.id ?? `sandbox-facebook-${user.id}`,
        accessToken: `sandbox:facebook:${facebookSamples}`,
      };

      totalGoogleSamples += googleSamples;
      totalFacebookSamples += facebookSamples;

      const displayName = user.name?.split(' ')[0] ?? `Member ${index + 1}`;
      const profileBlueprints: Array<Pick<StyleProfile, 'name' | 'style' | 'source'>> = [
        {
          name: `${sandboxProfilePrefix}${displayName} Inbox`,
          source: 'gmail',
          style:
            'Tone: Warm and precise. Diction favors active verbs and crisp openings. Sentence structure blends quick summaries with one detailed supporting sentence. Common phrases: "looping back", "thanks for flagging".',
        },
        {
          name: `${sandboxProfilePrefix}${displayName} Social`,
          source: 'facebook',
          style:
            'Tone: Playful and community-first. Diction is emoji-light but expressive. Sentences stay under 18 words with questions that invite conversation. Common phrases: "so pumped", "appreciate you".',
        },
      ];

      if (index === 0) {
        profileBlueprints.push({
          name: `${sandboxProfilePrefix}Brand Playbook`,
          source: 'text',
          style:
            'Tone: Visionary yet grounded. Diction highlights outcomes and momentum. Sentences alternate between bold declarations and succinct next steps. Common phrases: "operating rhythm", "ship velocity".',
        });
      }

      profileBlueprints.forEach(blueprint => {
        const profile: StyleProfile = {
          id: `style_${randomUUID()}`,
          userId: user.id,
          name: blueprint.name,
          style: blueprint.style,
          source: blueprint.source,
          createdAt: seededAt,
        };
        db.data!.style_profiles.push(profile);
        profilesCreated += 1;
      });
    });

    const monthWindows = Array.from({ length: 6 }, (_, offset) => {
      const cursor = new Date();
      cursor.setUTCDate(1);
      cursor.setUTCHours(12, 0, 0, 0);
      cursor.setMonth(cursor.getMonth() - offset);
      return { month: toMonthKey(cursor), cursor };
    }).reverse();

    const targetMonths = new Set(monthWindows.map(window => window.month));

    db.data.usage = db.data.usage.filter(
      record => record.organizationId !== organizationId || !targetMonths.has(record.month),
    );

    let usageRecordsCreated = 0;

    monthWindows.forEach(({ month, cursor }, index) => {
      const membership = activeMemberships[index % activeMemberships.length];
      const messageCount = randomInt(90, 240) + index * 8;
      const tokenCount = messageCount * randomInt(600, 920);
      const activityDay = index === monthWindows.length - 1 ? new Date(seededAt) : new Date(cursor);
      if (index !== monthWindows.length - 1) {
        activityDay.setUTCDate(randomInt(12, 26));
        activityDay.setUTCHours(randomInt(8, 18), randomInt(0, 59), 0, 0);
      }

      const usageRecord: UsageRecord = {
        id: `usage_${randomUUID()}`,
        organizationId,
        userId: membership.userId,
        month,
        messageCount,
        tokenCount,
        lastMessageAt: activityDay.toISOString(),
      };

      db.data!.usage.push(usageRecord);
      usageRecordsCreated += 1;
    });

    const sandboxAuditFilter = (log: AuditLog) =>
      !(log.organizationId === organizationId && log.metadata && (log.metadata as Record<string, unknown>).sandbox === true);
    db.data.auditLogs = db.data.auditLogs.filter(sandboxAuditFilter);

    const auditTemplates: Array<Omit<AuditLog, 'id' | 'createdAt'>> = [
      {
        organizationId,
        actorId,
        action: 'integration.connected',
        targetType: 'integration',
        targetId: 'google',
        metadata: { integration: 'google', sandbox: true, samples: totalGoogleSamples },
      },
      {
        organizationId,
        actorId: activeMemberships[0]?.userId ?? actorId,
        action: 'integration.connected',
        targetType: 'integration',
        targetId: 'facebook',
        metadata: { integration: 'facebook', sandbox: true, samples: totalFacebookSamples },
      },
      {
        organizationId,
        actorId,
        action: 'organization.automation.recommendation',
        targetType: 'automation',
        metadata: {
          sandbox: true,
          recommendation: 'Enable proactive drafting for high-frequency senders.',
        },
      },
      {
        organizationId,
        actorId,
        action: 'billing.trial.activated',
        targetType: 'billing',
        metadata: {
          sandbox: true,
          planId: organization.planId,
        },
      },
    ];

    const auditEventsCreated = auditTemplates.reduce((count, template, index) => {
      const createdAt = new Date(new Date(seededAt).getTime() - (index + 1) * 45 * 60 * 1000);
      const log: AuditLog = {
        id: `audit_${randomUUID()}`,
        createdAt: createdAt.toISOString(),
        ...template,
      };
      db.data!.auditLogs.push(log);
      return count + 1;
    }, 0);

    organization.metadata = {
      ...(organization.metadata ?? {}),
      sandboxSeededAt: seededAt,
      sandboxSeededBy: actorId,
      sandboxSamples: {
        google: totalGoogleSamples,
        facebook: totalFacebookSamples,
      },
    };
    organization.updatedAt = seededAt;

    await db.write();

    return {
      seededAt,
      membersSeeded,
      profilesCreated,
      usageRecordsCreated,
      auditEventsCreated,
    };
  }

  async revokeInvitation(actorId: string, organizationId: string, invitationId: string): Promise<void> {
    await this.assertRole(actorId, organizationId, ['owner', 'admin']);
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }
    const invitation = db.data.invitations.find(
      inv => inv.id === invitationId && inv.organizationId === organizationId && inv.status === 'pending',
    );
    if (!invitation) {
      throw new Error('Invitation not found.');
    }
    invitation.status = 'revoked';
    invitation.resolvedAt = new Date().toISOString();
    await db.write();

    await auditService.record({
      organizationId,
      actorId,
      action: 'organization.invite.revoked',
      targetType: 'invitation',
      targetId: invitation.id,
      metadata: { email: invitation.email },
    });
  }

  private getOrganizationByIdSync(id: string): Organization | undefined {
    return db.data?.organizations.find(org => org.id === id);
  }

  private async getSeatSnapshot(organizationId: string): Promise<OrganizationSeatSnapshot> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }
    const organization = this.getOrganizationByIdSync(organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }
    const plan = db.data.billingPlans.find(item => item.id === organization.planId);
    const members = db.data.memberships.filter(
      member => member.organizationId === organizationId && member.status === 'active',
    );
    const limit = plan?.limits.seats ?? 1;
    return {
      used: members.length,
      limit: limit === -1 ? 'unlimited' : limit,
    };
  }

  private async getLatestSubscriptionForOrganization(organizationId: string) {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }
    return (
      db.data.subscriptions
        .filter(subscription => subscription.organizationId === organizationId)
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0] ?? null
    );
  }

}

export const organizationService = new OrganizationService();
