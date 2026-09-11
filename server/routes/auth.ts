import { Router, Request, Response } from 'express';
import { registerUser, loginUser, logoutUser, validateSession, getUserByEmail, getAllUsers, deleteUser, updateUser } from '../lib/auth';

const router = Router();

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, ...additionalFields } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }
    const result = await registerUser(email, password, name, additionalFields);
    if (result.success) {
      res.json({ success: true, user: result.user });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }
    const result = await loginUser(email, password);
    if (result.success) {
      res.json({ success: true, user: result.user, token: result.session?.token });
    } else {
      res.status(401).json({ success: false, error: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (token) await logoutUser(token);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Validate session
router.get('/session', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token as string;
    if (!token) return res.json({ success: false, error: 'No token provided' });
    const user = await validateSession(token);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.json({ success: false, error: 'Invalid session' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get user by email
router.get('/user/:email', async (req: Request, res: Response) => {
  try {
    const user = await getUserByEmail(req.params.email);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.json({ success: false, error: 'User not found' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all users (admin only)
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update user
router.put('/user/:email', async (req: Request, res: Response) => {
  try {
    const success = await updateUser(req.params.email, req.body);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete user (soft delete)
router.delete('/user/:email', async (req: Request, res: Response) => {
  try {
    const success = await deleteUser(req.params.email);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;