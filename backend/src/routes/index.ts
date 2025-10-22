import { Router } from 'express';
import { apiRoutes } from './api';
import { cartRoutes } from './cart';
import { feedRoutes } from './feed';
import { healthRoutes } from './health';
import { locationRoutes } from './location';
import { searchItemsRoutes } from './searchItems';
import { userRoutes } from './user';

const mainRouter: Router = Router();

mainRouter.use('/cart', cartRoutes);
mainRouter.use('/location', locationRoutes);
mainRouter.use('/user', userRoutes);
mainRouter.use('/feed', feedRoutes);
mainRouter.use('/search-items', searchItemsRoutes);
mainRouter.use('/health', healthRoutes);
mainRouter.use('/', apiRoutes);

export { mainRouter };
