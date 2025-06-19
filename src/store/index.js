import { configureStore } from '@reduxjs/toolkit';
import commissionReducer from './commissionSlice';
import restaurantReducer from './actions/restaurantSlice';

export const store = configureStore({
  reducer: {
    commission: commissionReducer,
    restaurant: restaurantReducer,
  },
});

export default store;