import { createSlice } from '@reduxjs/toolkit';

const commissionSlice = createSlice({
  name: 'commission',
  initialState: {
    commissionRate: 4,
  },
  reducers: {
    setCommissionRate(state, action) {
      state.commissionRate = action.payload;
    },
  },
});

export const { setCommissionRate } = commissionSlice.actions;
export default commissionSlice.reducer;