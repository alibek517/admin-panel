import { createSlice } from '@reduxjs/toolkit';

const restaurantSlice = createSlice({
  name: 'restaurant',
  initialState: {
    restaurantName: 'Otabek kafe',
  },
  reducers: {
    setRestaurantName: (state, action) => {
      state.restaurantName = action.payload;
    },
  },
});

export const { setRestaurantName } = restaurantSlice.actions;
export default restaurantSlice.reducer;