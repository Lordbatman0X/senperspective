import { Router, Request, Response } from 'express';
import { getCollection } from '../lib/mongodb';

const router = Router();

// Generic CRUD operations for any collection
const collections = ['articles', 'comments', 'messages', 'media', 'ads', 'subscribers', 'users', 'sessions', 'analytics_events', 'site_settings'];

for (const collectionName of collections) {
  // Get all documents
  router.get(`/${collectionName}`, async (req: Request, res: Response) => {
    try {
      const collection = await getCollection(collectionName);
      if (!collection) {
        return res.json({ success: true, documents: [] });
      }
      const docs = await collection.find({ deletedAt: { $exists: false } }).toArray();
      res.json({ success: true, documents: docs, count: docs.length });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get single document
  router.get(`/${collectionName}/:id`, async (req: Request, res: Response) => {
    try {
      const collection = await getCollection(collectionName);
      if (!collection) {
        return res.json({ success: false, error: 'Database not available' });
      }
      const doc = await collection.findOne({ $or: [{ _id: req.params.id }, { id: req.params.id }, { email: req.params.id }] });
      if (doc) {
        const { passwordHash, ...safeDoc } = doc;
        res.json({ success: true, data: safeDoc });
      } else {
        res.json({ success: false, error: 'Not found' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create/Update document (upsert)
  router.post(`/${collectionName}/:id`, async (req: Request, res: Response) => {
    try {
      const collection = await getCollection(collectionName);
      if (!collection) {
        return res.status(503).json({ success: false, error: 'Database not available' });
      }
      
      const data = { ...req.body, updatedAt: new Date() };
      delete data._id;
      
      // Never allow setting deletedAt via API unless explicitly clearing it
      if (data.deletedAt === undefined) {
        data.deletedAt = null;
      }

      await collection.updateOne(
        { $or: [{ _id: req.params.id }, { id: req.params.id }, { email: req.params.id }] },
        { $set: data, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );
      
      res.json({ success: true, id: req.params.id });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete document (soft delete)
  router.delete(`/${collectionName}/:id`, async (req: Request, res: Response) => {
    try {
      const collection = await getCollection(collectionName);
      if (!collection) {
        return res.status(503).json({ success: false, error: 'Database not available' });
      }
      
      // Protected accounts
      if (collectionName === 'users' && (req.params.id === 'kadersdiaz3@gmail.com' || req.params.id === 'admin@perspective.sn')) {
        return res.status(403).json({ success: false, error: 'Cannot delete protected account' });
      }
      
      await collection.updateOne(
        { $or: [{ _id: req.params.id }, { id: req.params.id }, { email: req.params.id }] },
        { $set: { deletedAt: new Date().toISOString(), updatedAt: new Date() } }
      );
      
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

// Wipe collection
router.delete(`/${collections.map(c => `collection/${c}/wipe`).join('|')}`, async (req: Request, res: Response) => {
  res.status(400).json({ success: false, error: 'Invalid route' });
});

for (const collectionName of collections) {
  router.delete(`/collection/${collectionName}/wipe`, async (req: Request, res: Response) => {
    try {
      const collection = await getCollection(collectionName);
      if (!collection) {
        return res.status(503).json({ success: false, error: 'Database not available' });
      }
      
      if (collectionName === 'users') {
        // Soft delete all except protected accounts
        await collection.updateMany(
          { email: { $nin: ['kadersdiaz3@gmail.com', 'admin@perspective.sn'] } },
          { $set: { deletedAt: new Date().toISOString() } }
        );
      } else {
        await collection.deleteMany({});
      }
      
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

export default router;