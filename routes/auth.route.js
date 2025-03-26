import express from 'express';
import {
  login,
  signup,
} from '../controllers/auth.controller.js';

const authR = express.Router();

authR.post('/login', login);
authR.post('/signup', signup);

export default authR;