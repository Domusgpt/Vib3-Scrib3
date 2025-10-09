import { Router, Request, Response } from 'express';
import { organizationService } from './organization.service';
import { OrganizationRole } from '../../types';

const router = Router();

router.use((req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  return next();
});

router.get('/', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  await organizationService.ensurePersonalWorkspace(req.user);
  const summaries = await organizationService.listSummariesForUser(req.user.id);
  const activeOrganizationId =
    req.session?.activeOrganizationId ?? summaries[0]?.organization.id ?? null;

  if (req.session) {
    req.session.activeOrganizationId = activeOrganizationId ?? undefined;
  }

  res.json({
    organizations: summaries,
    activeOrganizationId,
  });
});

router.post('/', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const { name, planId } = req.body as { name: string; planId?: string };
  if (!name) {
    return res.status(400).json({ message: 'Organization name is required.' });
  }

  try {
    const summary = await organizationService.createOrganization(req.user.id, name, planId);
    if (req.session) {
      req.session.activeOrganizationId = summary.organization.id;
    }
    res.status(201).json(summary);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to create organization.' });
  }
});

router.post('/active', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  const { organizationId } = req.body as { organizationId: string };
  if (!organizationId) {
    return res.status(400).json({ message: 'organizationId is required.' });
  }

  try {
    await organizationService.assertRole(req.user.id, organizationId, ['owner', 'admin', 'author', 'viewer']);
    if (req.session) {
      req.session.activeOrganizationId = organizationId;
    }
    res.json({ activeOrganizationId: organizationId });
  } catch (error) {
    res.status(403).json({ message: error instanceof Error ? error.message : 'Unable to switch organization.' });
  }
});

router.get('/:organizationId/members', async (req: Request, res: Response) => {
  const { organizationId } = req.params;
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  try {
    await organizationService.assertRole(req.user.id, organizationId, ['owner', 'admin', 'author', 'viewer']);
    const members = await organizationService.getMembers(organizationId);
    res.json(members);
  } catch (error) {
    res.status(403).json({ message: error instanceof Error ? error.message : 'Unable to load members.' });
  }
});

router.get('/:organizationId/invitations', async (req: Request, res: Response) => {
  const { organizationId } = req.params;
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  try {
    await organizationService.assertRole(req.user.id, organizationId, ['owner', 'admin']);
    const invitations = await organizationService.listInvitations(organizationId);
    res.json(invitations);
  } catch (error) {
    res.status(403).json({ message: error instanceof Error ? error.message : 'Unable to load invitations.' });
  }
});

router.post('/:organizationId/invitations', async (req: Request, res: Response) => {
  const { organizationId } = req.params;
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const { email, role } = req.body as { email: string; role: OrganizationRole };
  if (!email || !role) {
    return res.status(400).json({ message: 'Email and role are required.' });
  }

  try {
    const invitation = await organizationService.inviteMember({
      organizationId,
      inviterId: req.user.id,
      email,
      role,
    });
    res.status(201).json(invitation);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to send invitation.' });
  }
});

router.delete('/:organizationId/invitations/:invitationId', async (req: Request, res: Response) => {
  const { organizationId, invitationId } = req.params;
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  try {
    await organizationService.revokeInvitation(req.user.id, organizationId, invitationId);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to revoke invitation.' });
  }
});

router.post('/invitations/:token/accept', async (req: Request, res: Response) => {
  const { token } = req.params;
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  try {
    const result = await organizationService.acceptInvitation(token, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to accept invitation.' });
  }
});

router.patch('/:organizationId/members/:memberId', async (req: Request, res: Response) => {
  const { organizationId, memberId } = req.params;
  const { role } = req.body as { role: OrganizationRole };
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  if (!role) {
    return res.status(400).json({ message: 'Role is required.' });
  }
  try {
    const membership = await organizationService.updateMemberRole(req.user.id, organizationId, memberId, role);
    res.json(membership);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to update member.' });
  }
});

router.delete('/:organizationId/members/:memberId', async (req: Request, res: Response) => {
  const { organizationId, memberId } = req.params;
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  try {
    await organizationService.removeMember(req.user.id, organizationId, memberId);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to remove member.' });
  }
});

export default router;
