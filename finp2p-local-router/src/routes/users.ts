import { Router } from 'express';
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '../controllers/users';

const router = Router();

// GET /users - Get all users
router.get('/', getUsers);

// GET /users/:id - Get user by ID
router.get('/:id', getUserById);

// POST /users - Create new user
router.post('/', createUser);

// PUT /users/:id - Update user
router.put('/:id', updateUser);

// DELETE /users/:id - Delete user
router.delete('/:id', deleteUser);

export default router;